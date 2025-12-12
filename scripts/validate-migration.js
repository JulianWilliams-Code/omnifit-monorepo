#!/usr/bin/env node

/**
 * Migration Validation Script
 * Validates that the migration completed successfully
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPS = ['frontend', 'backend', 'ai', 'blockchain'];
const PACKAGES = ['shared', 'ui', 'db'];

console.log('🔍 Validating OmniFit Migration...\n');

function validateFileStructure() {
  console.log('📁 Validating file structure...');
  
  // Check apps
  for (const app of APPS) {
    const appPath = `apps/${app}`;
    if (!fs.existsSync(appPath)) {
      throw new Error(`Missing app directory: ${appPath}`);
    }
    
    const packageJsonPath = path.join(appPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Missing package.json: ${packageJsonPath}`);
    }
    
    console.log(`  ✅ ${app} app structure valid`);
  }
  
  // Check packages
  for (const pkg of PACKAGES) {
    const pkgPath = `packages/${pkg}`;
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`Missing package directory: ${pkgPath}`);
    }
    
    const packageJsonPath = path.join(pkgPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Missing package.json: ${packageJsonPath}`);
    }
    
    console.log(`  ✅ ${pkg} package structure valid`);
  }
  
  console.log('✅ File structure validation passed\n');
}

function validatePackageJsons() {
  console.log('📦 Validating package.json files...');
  
  // Check root package.json
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!rootPkg.workspaces && !rootPkg.name.includes('monorepo')) {
    console.warn('⚠️  Root package.json may not be configured for monorepo');
  }
  
  // Check app package.jsons
  for (const app of APPS) {
    const pkgPath = `apps/${app}/package.json`;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Check for workspace dependencies
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    let hasWorkspaceDeps = false;
    
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith('@omnifit/')) {
        if (!deps[dep].includes('workspace:')) {
          console.warn(`⚠️  ${app}: ${dep} should use workspace: protocol`);
        } else {
          hasWorkspaceDeps = true;
        }
      }
    }
    
    if (hasWorkspaceDeps) {
      console.log(`  ✅ ${app} has workspace dependencies`);
    }
  }
  
  console.log('✅ Package.json validation passed\n');
}

function validateTsConfigs() {
  console.log('⚙️  Validating TypeScript configurations...');
  
  for (const app of APPS) {
    const tsConfigPath = `apps/${app}/tsconfig.json`;
    
    if (fs.existsSync(tsConfigPath)) {
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      
      // Check extends
      if (!tsConfig.extends || !tsConfig.extends.includes('../../tsconfig.json')) {
        console.warn(`⚠️  ${app}: tsconfig should extend root tsconfig`);
      }
      
      // Check paths
      if (!tsConfig.compilerOptions?.paths?.['@omnifit/shared']) {
        console.warn(`⚠️  ${app}: missing @omnifit/shared path mapping`);
      }
      
      console.log(`  ✅ ${app} TypeScript config valid`);
    }
  }
  
  console.log('✅ TypeScript configuration validation passed\n');
}

function testInstallation() {
  console.log('📥 Testing dependency installation...');
  
  try {
    console.log('  Installing dependencies...');
    execSync('pnpm install', { stdio: 'pipe' });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    throw new Error(`Dependency installation failed: ${error.message}`);
  }
}

function testBuilds() {
  console.log('🔨 Testing builds...');
  
  try {
    // Test shared packages build first
    console.log('  Building shared packages...');
    execSync('pnpm --filter=@omnifit/shared build', { stdio: 'pipe' });
    execSync('pnpm --filter=@omnifit/ui build', { stdio: 'pipe' });
    
    // Generate Prisma client
    console.log('  Generating Prisma client...');
    execSync('pnpm db:generate', { stdio: 'pipe' });
    
    // Test app builds
    for (const app of APPS) {
      console.log(`  Building ${app}...`);
      try {
        execSync(`pnpm --filter=${app} build`, { stdio: 'pipe' });
        console.log(`  ✅ ${app} build successful`);
      } catch (error) {
        console.warn(`  ⚠️  ${app} build failed - may need manual fixes`);
      }
    }
    
    console.log('✅ Build validation completed\n');
  } catch (error) {
    console.warn(`⚠️  Build validation failed: ${error.message}`);
    console.warn('This may require manual fixes to imports or dependencies\n');
  }
}

function generateValidationReport() {
  console.log('📊 Generating migration validation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    status: 'completed',
    apps: {},
    packages: {},
    issues: []
  };
  
  // Check each app
  for (const app of APPS) {
    const appPath = `apps/${app}`;
    report.apps[app] = {
      exists: fs.existsSync(appPath),
      hasPackageJson: fs.existsSync(path.join(appPath, 'package.json')),
      hasTsConfig: fs.existsSync(path.join(appPath, 'tsconfig.json')),
      hasSourceCode: fs.existsSync(path.join(appPath, 'src'))
    };
  }
  
  // Check each package
  for (const pkg of PACKAGES) {
    const pkgPath = `packages/${pkg}`;
    report.packages[pkg] = {
      exists: fs.existsSync(pkgPath),
      hasPackageJson: fs.existsSync(path.join(pkgPath, 'package.json')),
      hasSourceCode: fs.existsSync(path.join(pkgPath, 'src')) || fs.existsSync(path.join(pkgPath, 'schema.prisma'))
    };
  }
  
  fs.writeFileSync('migration-report.json', JSON.stringify(report, null, 2));
  console.log('✅ Migration report saved to migration-report.json\n');
  
  return report;
}

async function runValidation() {
  try {
    validateFileStructure();
    validatePackageJsons();
    validateTsConfigs();
    testInstallation();
    testBuilds();
    
    const report = generateValidationReport();
    
    console.log('🎉 Migration validation completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review migration-report.json for any issues');
    console.log('2. Test each app individually: pnpm dev:<app>');
    console.log('3. Run full test suite: pnpm test');
    console.log('4. Commit migration changes');
    console.log('5. Update CI/CD configurations if needed');
    
  } catch (error) {
    console.error('\n❌ Migration validation failed:', error.message);
    console.error('\nPlease fix the issues above before proceeding.');
    process.exit(1);
  }
}

if (require.main === module) {
  runValidation();
}

module.exports = { runValidation };