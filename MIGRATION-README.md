# 🚀 OmniFit Monorepo Migration Guide

This guide will help you migrate your existing multi-repository setup into the TurboRepo monorepo structure.

## ⚠️ IMPORTANT: Read This First!

**BACKUP YOUR REPOSITORIES BEFORE STARTING!** This migration will modify files and git history. Always have backups.

```bash
# Create backups
mkdir ~/omnifit-backup
cd ~/omnifit-backup
git clone https://github.com/JulianWilliams-Code/omnifit-frontend.git
git clone https://github.com/JulianWilliams-Code/omnifit-backend.git
git clone https://github.com/JulianWilliams-Code/omnifit-ai.git
git clone https://github.com/JulianWilliams-Code/omnifit-blockchain.git
```

## 🎯 Migration Overview

This migration will:
- ✅ Preserve complete commit history from all 4 repositories
- ✅ Consolidate dependencies and remove duplicates
- ✅ Update all imports to use workspace packages
- ✅ Move Prisma to shared `packages/db` location
- ✅ Consolidate environment variables
- ✅ Update TypeScript configurations for monorepo
- ✅ Maintain working development and build processes

## 📋 Quick Start Migration

### Option 1: Automated Migration (Recommended)

```bash
# 1. Navigate to monorepo
cd /Users/julianwilliams/omnifit-monorepo

# 2. Clone your existing repos to parent directory
cd ..
git clone https://github.com/JulianWilliams-Code/omnifit-frontend.git
git clone https://github.com/JulianWilliams-Code/omnifit-backend.git
git clone https://github.com/JulianWilliams-Code/omnifit-ai.git
git clone https://github.com/JulianWilliams-Code/omnifit-blockchain.git

# 3. Return to monorepo and run migration
cd omnifit-monorepo
node scripts/migrate-repos.js

# 4. Validate migration
node scripts/validate-migration.js

# 5. Test everything works
./scripts/dev-commands.sh setup
./scripts/dev-commands.sh dev
```

### Option 2: Step-by-Step Migration

```bash
# 1. Setup migration branch and preserve git history
./scripts/git-migration.sh setup-migration
./scripts/git-migration.sh preserve-history
./scripts/git-migration.sh create-merge

# 2. Run file migration
node scripts/migrate-repos.js

# 3. Validate and test
node scripts/validate-migration.js
./scripts/dev-commands.sh setup

# 4. Finalize migration
./scripts/git-migration.sh finalize
```

## 🔍 What Each Script Does

### 1. `migrate-repos.js` - File Migration
- Copies source files from separate repos to monorepo structure
- Merges package.json files and deduplicates dependencies
- Updates imports to use workspace packages (@omnifit/shared, @omnifit/ui)
- Updates TypeScript path mappings
- Consolidates environment variables
- Moves Prisma files to packages/db

### 2. `validate-migration.js` - Migration Testing
- Validates file structure is correct
- Checks package.json configurations
- Tests TypeScript configurations
- Runs installation and build tests
- Generates migration report

### 3. `git-migration.sh` - Git History Preservation
- Preserves complete commit history from all repos
- Creates proper merge commits
- Maintains attribution and timestamps
- Sets up migration branch workflow

### 4. `dev-commands.sh` - Development Helper
- Provides easy commands for testing migration
- Supports running individual apps or full system
- Includes database, Docker, and build commands

## 🧪 Testing Your Migration

### Test Individual Apps
```bash
# Test each app individually
./scripts/dev-commands.sh dev:frontend    # http://localhost:3000
./scripts/dev-commands.sh dev:backend     # http://localhost:3001
./scripts/dev-commands.sh dev:ai         # http://localhost:3002
./scripts/dev-commands.sh dev:blockchain  # CLI tools
```

### Test Full System
```bash
# Run all apps together
./scripts/dev-commands.sh dev

# Test with Docker
./scripts/dev-commands.sh docker:up
```

### Test Builds
```bash
# Build everything
./scripts/dev-commands.sh build

# Test packaging
pnpm --filter=@omnifit/shared build
pnpm --filter=@omnifit/ui build
pnpm --filter=frontend build
```

## 🚨 Common Issues & Solutions

### Issue: Import Errors
**Problem**: `Cannot resolve module '@omnifit/shared'`
**Solution**: 
```bash
# Rebuild shared packages
pnpm --filter=@omnifit/shared build
pnpm --filter=@omnifit/ui build
```

### Issue: Database Connection Errors
**Problem**: Prisma client not found
**Solution**:
```bash
# Regenerate Prisma client
pnpm db:generate
```

### Issue: TypeScript Path Errors
**Problem**: Module path mapping not working
**Solution**: Check `tsconfig.json` in each app has correct `extends` and `paths`

### Issue: Environment Variable Errors
**Problem**: Missing environment variables
**Solution**: Copy `.env.example` to `.env` and fill in values

## 🔧 Manual Verification Checklist

After running the automated migration, manually verify:

- [ ] All source files copied to correct locations
- [ ] No secrets or private keys committed
- [ ] Environment variables properly consolidated
- [ ] Imports updated to use workspace packages
- [ ] TypeScript configurations extend root config
- [ ] Database connection strings updated
- [ ] Build process works for all apps
- [ ] Tests pass for all packages
- [ ] Development servers start correctly

## 📊 Migration Report

The validation script generates `migration-report.json` with:
- File structure validation results
- Package.json merge status
- TypeScript configuration status
- Build test results
- Detailed issue list

## 🔄 Rollback Plan

If migration fails:

### Automated Rollback
```bash
./scripts/git-migration.sh rollback
```

### Manual Rollback
```bash
# 1. Switch to main branch
git checkout main

# 2. Delete migration branch
git branch -D migration/multi-repo-merge

# 3. Continue using separate repositories
```

## 🎉 Post-Migration Tasks

Once migration is successful:

1. **Create Pull Request**
   ```bash
   # Push migration branch and create PR
   git push -u origin migration/multi-repo-merge
   gh pr create --title "feat: migrate to monorepo" --body "Complete migration from multi-repo to TurboRepo monorepo"
   ```

2. **Update CI/CD**
   - Update GitHub Actions workflows
   - Update deployment scripts
   - Update repository secrets

3. **Team Communication**
   - Update development documentation
   - Train team on monorepo workflows
   - Update IDE/editor configurations

4. **Cleanup** (after 30 days)
   - Archive old repositories
   - Update external service configurations
   - Remove old deployment pipelines

## 📞 Support

If you encounter issues:

1. Check `migration-report.json` for specific errors
2. Run `./scripts/dev-commands.sh check` to verify services
3. Review the [Migration Checklist](MIGRATION-CHECKLIST.md)
4. Check logs with `./scripts/dev-commands.sh docker:logs`

## 🔗 Useful Commands

```bash
# Quick health check
./scripts/dev-commands.sh check

# Show port usage
./scripts/dev-commands.sh ports

# Clean and reinstall
./scripts/dev-commands.sh clean
./scripts/dev-commands.sh setup

# Database operations
./scripts/dev-commands.sh db:studio
./scripts/dev-commands.sh db:migrate

# Git migration status
./scripts/git-migration.sh status
```

---

**Good luck with your migration! 🚀**

The automated scripts handle most of the complexity, but always verify the results and test thoroughly before deploying to production.