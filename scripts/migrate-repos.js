#!/usr/bin/env node

/**
 * OmniFit Repository Migration Script
 * Migrates existing multi-repo structure into TurboRepo monorepo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPOS = {
  frontend: {
    source: '../omnifit-frontend',
    target: 'apps/frontend',
    preserveDirs: ['src', 'public', 'components', 'pages', 'app', 'lib', 'hooks', 'utils', 'styles'],
    packageJsonMerge: true
  },
  backend: {
    source: '../omnifit-backend', 
    target: 'apps/backend',
    preserveDirs: ['src', 'prisma', 'test', 'scripts'],
    packageJsonMerge: true
  },
  ai: {
    source: '../omnifit-ai',
    target: 'apps/ai', 
    preserveDirs: ['src', 'lib', 'utils', 'prompts', 'models'],
    packageJsonMerge: true
  },
  blockchain: {
    source: '../omnifit-blockchain',
    target: 'apps/blockchain',
    preserveDirs: ['src', 'scripts', 'contracts', 'lib', 'utils'],
    packageJsonMerge: true
  }
};

console.log('🚀 Starting OmniFit Multi-Repo Migration...\n');

function checkPrerequisites() {
  console.log('✅ Checking prerequisites...');
  
  // Check if backup repos exist
  for (const [name, config] of Object.entries(REPOS)) {
    if (!fs.existsSync(config.source)) {
      console.error(`❌ Source repository not found: ${config.source}`);
      console.error(`Please clone ${name} repository to the parent directory first.`);
      process.exit(1);
    }
  }
  
  // Check if we're in monorepo root
  if (!fs.existsSync('turbo.json') || !fs.existsSync('pnpm-workspace.yaml')) {
    console.error('❌ Not in monorepo root directory. Please run from omnifit-monorepo root.');
    process.exit(1);
  }
  
  console.log('✅ Prerequisites checked\n');
}

function backupCurrentState() {
  console.log('📦 Creating backup of current monorepo state...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `../monorepo-backup-${timestamp}`;
  
  try {
    execSync(`cp -r . "${backupDir}"`, { stdio: 'inherit' });
    console.log(`✅ Backup created: ${backupDir}\n`);
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    process.exit(1);
  }
}

function copyFiles(source, target, preserveDirs) {
  console.log(`📁 Copying files from ${source} to ${target}...`);
  
  // Ensure target directory exists
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  // Copy specific directories
  for (const dir of preserveDirs) {
    const sourcePath = path.join(source, dir);
    const targetPath = path.join(target, dir);
    
    if (fs.existsSync(sourcePath)) {
      try {
        execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: 'pipe' });
        console.log(`  ✅ Copied ${dir}/`);
      } catch (error) {
        console.log(`  ⚠️  Could not copy ${dir}/ (may not exist)`);
      }
    }
  }
  
  // Copy important root files
  const rootFiles = ['.env.example', '.env.local', 'README.md', 'tsconfig.json', 'next.config.js', 'nest-cli.json', '.eslintrc.js'];
  for (const file of rootFiles) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  ✅ Copied ${file}`);
      } catch (error) {
        console.log(`  ⚠️  Could not copy ${file}`);
      }
    }
  }
}

function mergePackageJson(repoName, source, target) {
  console.log(`📦 Merging package.json for ${repoName}...`);
  
  const sourcePkgPath = path.join(source, 'package.json');
  const targetPkgPath = path.join(target, 'package.json');
  
  if (!fs.existsSync(sourcePkgPath)) {
    console.log(`  ⚠️  No package.json found in ${source}`);
    return;
  }
  
  const sourcePkg = JSON.parse(fs.readFileSync(sourcePkgPath, 'utf8'));
  let targetPkg = {};
  
  if (fs.existsSync(targetPkgPath)) {
    targetPkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf8'));
  }
  
  // Merge dependencies intelligently
  const mergedPkg = {
    ...targetPkg,
    name: targetPkg.name || sourcePkg.name,
    version: targetPkg.version || sourcePkg.version || '0.1.0',
    scripts: {
      ...sourcePkg.scripts,
      ...targetPkg.scripts
    },
    dependencies: {
      ...sourcePkg.dependencies,
      ...targetPkg.dependencies
    },
    devDependencies: {
      ...sourcePkg.devDependencies,
      ...targetPkg.devDependencies
    }
  };
  
  // Add workspace dependencies
  if (repoName === 'frontend') {
    mergedPkg.dependencies = {
      '@omnifit/shared': 'workspace:*',
      '@omnifit/ui': 'workspace:*',
      ...mergedPkg.dependencies
    };
  }
  
  if (repoName === 'backend' || repoName === 'ai') {
    mergedPkg.dependencies = {
      '@omnifit/shared': 'workspace:*',
      '@omnifit/db': 'workspace:*',
      ...mergedPkg.dependencies
    };
  }
  
  if (repoName === 'blockchain') {
    mergedPkg.dependencies = {
      '@omnifit/shared': 'workspace:*',
      ...mergedPkg.dependencies
    };
  }
  
  fs.writeFileSync(targetPkgPath, JSON.stringify(mergedPkg, null, 2));
  console.log(`  ✅ Merged package.json for ${repoName}`);
}

function updateImports(targetDir, repoName) {
  console.log(`🔗 Updating imports in ${targetDir}...`);
  
  const updateImportsInFile = (filePath) => {
    if (!fs.existsSync(filePath) || !filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Update Prisma imports for backend/ai
      if (repoName === 'backend' || repoName === 'ai') {
        const oldPrismaImport = /from ['"]\.\/prisma\/.*?['"]/g;
        const newPrismaImport = "from '@omnifit/db'";
        if (content.match(oldPrismaImport)) {
          content = content.replace(oldPrismaImport, newPrismaImport);
          modified = true;
        }
        
        // Update @prisma/client imports
        const prismaClientImport = /from ['"]@prisma\/client['"]/g;
        if (content.match(prismaClientImport)) {
          content = content.replace(prismaClientImport, "from '@omnifit/db'");
          modified = true;
        }
      }
      
      // Update shared utilities imports
      const sharedImports = [
        { old: /from ['"]\.\.\/shared\/.*?['"]/g, new: "from '@omnifit/shared'" },
        { old: /from ['"]\.\/shared\/.*?['"]/g, new: "from '@omnifit/shared'" },
        { old: /import.*?from ['"]shared\/.*?['"]/g, new: "from '@omnifit/shared'" }
      ];
      
      for (const { old, new: newImport } of sharedImports) {
        if (content.match(old)) {
          content = content.replace(old, newImport);
          modified = true;
        }
      }
      
      // Update UI component imports for frontend
      if (repoName === 'frontend') {
        const uiImports = [
          { old: /from ['"]\.\/components\/ui\/.*?['"]/g, new: "from '@omnifit/ui'" },
          { old: /from ['"]\.\.\/components\/ui\/.*?['"]/g, new: "from '@omnifit/ui'" }
        ];
        
        for (const { old, new: newImport } of uiImports) {
          if (content.match(old)) {
            content = content.replace(old, newImport);
            modified = true;
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`    ✅ Updated imports in ${path.relative(targetDir, filePath)}`);
      }
    } catch (error) {
      console.log(`    ⚠️  Could not update imports in ${filePath}: ${error.message}`);
    }
  };
  
  // Recursively update imports in all files
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (stat.isFile()) {
        updateImportsInFile(filePath);
      }
    }
  };
  
  walkDir(targetDir);
}

function updateTsConfig(targetDir, repoName) {
  console.log(`⚙️  Updating TypeScript configuration for ${repoName}...`);
  
  const tsConfigPath = path.join(targetDir, 'tsconfig.json');
  
  if (!fs.existsSync(tsConfigPath)) {
    console.log(`  ⚠️  No tsconfig.json found in ${targetDir}`);
    return;
  }
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    
    // Extend from root tsconfig
    tsConfig.extends = '../../tsconfig.json';
    
    // Update paths for monorepo structure
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }
    
    if (!tsConfig.compilerOptions.paths) {
      tsConfig.compilerOptions.paths = {};
    }
    
    // Add workspace path mappings
    tsConfig.compilerOptions.paths = {
      '@omnifit/shared': ['../../packages/shared/src'],
      '@omnifit/shared/*': ['../../packages/shared/src/*'],
      '@omnifit/ui': ['../../packages/ui/src'],
      '@omnifit/ui/*': ['../../packages/ui/src/*'],
      '@omnifit/db': ['../../packages/db'],
      '@omnifit/db/*': ['../../packages/db/*'],
      ...tsConfig.compilerOptions.paths
    };
    
    // Update baseUrl
    tsConfig.compilerOptions.baseUrl = '.';
    
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log(`  ✅ Updated tsconfig.json for ${repoName}`);
  } catch (error) {
    console.log(`  ⚠️  Could not update tsconfig.json: ${error.message}`);
  }
}

function consolidateEnvironmentVars() {
  console.log('🌍 Consolidating environment variables...');
  
  const envVars = new Set();
  const envFiles = {};
  
  // Collect environment variables from all repos
  for (const [name, config] of Object.entries(REPOS)) {
    const envExamplePath = path.join(config.source, '.env.example');
    const envPath = path.join(config.source, '.env');
    
    [envExamplePath, envPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        envFiles[name] = envFiles[name] || [];
        envFiles[name].push({ path: filePath, content });
        
        // Extract variable names
        const matches = content.match(/^[A-Z_][A-Z0-9_]*=/gm) || [];
        matches.forEach(match => envVars.add(match.replace('=', '')));
      }
    });
  }
  
  // Write consolidated .env.example
  const consolidatedEnv = Array.from(envVars).sort().map(varName => {
    // Find example value from existing files
    for (const [repoName, files] of Object.entries(envFiles)) {
      for (const file of files) {
        const match = file.content.match(new RegExp(`^${varName}=(.*)$`, 'm'));
        if (match) {
          return `${varName}=${match[1]}`;
        }
      }
    }
    return `${varName}=`;
  }).join('\n');
  
  fs.writeFileSync('.env.example', consolidatedEnv);
  console.log('  ✅ Consolidated environment variables in .env.example');
  
  // Copy app-specific environment files
  for (const [name, config] of Object.entries(REPOS)) {
    const targetEnvPath = path.join(config.target, '.env.example');
    const sourceEnvPath = path.join(config.source, '.env.example');
    
    if (fs.existsSync(sourceEnvPath)) {
      fs.copyFileSync(sourceEnvPath, targetEnvPath);
      console.log(`  ✅ Copied .env.example for ${name}`);
    }
  }
}

function movePrismaToPackages() {
  console.log('🗃️  Moving Prisma to packages/db...');
  
  const backendPrismaPath = path.join(REPOS.backend.source, 'prisma');
  const packagesDbPath = 'packages/db';
  
  if (fs.existsSync(backendPrismaPath)) {
    // Copy migrations and seed files
    const prismaFiles = ['migrations', 'seed.ts', 'seed.js'];
    
    for (const file of prismaFiles) {
      const sourcePath = path.join(backendPrismaPath, file);
      const targetPath = path.join(packagesDbPath, file);
      
      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: 'pipe' });
        } else {
          fs.copyFileSync(sourcePath, targetPath);
        }
        console.log(`  ✅ Moved ${file}`);
      }
    }
  }
  
  // Update package.json in packages/db
  const dbPackagePath = path.join(packagesDbPath, 'package.json');
  if (fs.existsSync(dbPackagePath)) {
    const dbPackage = JSON.parse(fs.readFileSync(dbPackagePath, 'utf8'));
    
    // Add Prisma scripts if they don't exist
    if (!dbPackage.scripts) {
      dbPackage.scripts = {};
    }
    
    dbPackage.scripts = {
      'db:generate': 'prisma generate',
      'db:push': 'prisma db push',
      'db:migrate': 'prisma migrate dev',
      'db:studio': 'prisma studio',
      'db:seed': 'prisma db seed',
      ...dbPackage.scripts
    };
    
    fs.writeFileSync(dbPackagePath, JSON.stringify(dbPackage, null, 2));
    console.log('  ✅ Updated packages/db/package.json with Prisma scripts');
  }
}

async function runMigration() {
  try {
    checkPrerequisites();
    backupCurrentState();
    
    // Migrate each repository
    for (const [name, config] of Object.entries(REPOS)) {
      console.log(`\n📦 Migrating ${name} repository...`);
      
      copyFiles(config.source, config.target, config.preserveDirs);
      
      if (config.packageJsonMerge) {
        mergePackageJson(name, config.source, config.target);
      }
      
      updateImports(config.target, name);
      updateTsConfig(config.target, name);
    }
    
    consolidateEnvironmentVars();
    movePrismaToPackages();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: pnpm install');
    console.log('2. Run: pnpm db:generate');
    console.log('3. Run: pnpm build');
    console.log('4. Run: pnpm dev');
    console.log('5. Test each app individually');
    console.log('6. Commit changes to migration branch');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check the error above and try again.');
    console.error('Your original repositories and monorepo backup are safe.');
    process.exit(1);
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, REPOS };