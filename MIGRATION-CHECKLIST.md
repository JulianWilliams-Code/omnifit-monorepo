# OmniFit Migration Checklist

## ⚠️ High-Risk Manual Changes (VERIFY BEFORE PROCEEDING)

### 🔐 Security & Secrets
- [ ] **Private keys and wallet files** - Never commit these to the monorepo
  - [ ] Check for `.key`, `.pem`, `wallet.json`, `keypair.json` files
  - [ ] Verify Solana keypairs are not in source code
  - [ ] Move all secrets to environment variables

- [ ] **Environment variables containing secrets**
  - [ ] JWT secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
  - [ ] Database passwords (`DATABASE_URL`)
  - [ ] API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
  - [ ] Blockchain private keys (`MINT_AUTHORITY_SECRET_KEY`)

- [ ] **CI/CD secrets in GitHub Actions**
  - [ ] Update repository secrets for monorepo
  - [ ] Verify secrets are not hardcoded in workflow files
  - [ ] Update deployment keys and credentials

### 🔌 External Integrations
- [ ] **Database connections**
  - [ ] Update connection strings for new Prisma location
  - [ ] Verify database migrations work with new structure
  - [ ] Test connection pooling settings

- [ ] **API endpoints and webhooks**
  - [ ] Update any external services pointing to old repositories
  - [ ] Verify webhook URLs still work
  - [ ] Update CORS settings for new monorepo domain

- [ ] **Blockchain network settings**
  - [ ] Verify Solana cluster configuration (devnet/testnet/mainnet)
  - [ ] Check token mint addresses are correct
  - [ ] Verify wallet adapter settings

### 📦 Package Dependencies
- [ ] **Version conflicts**
  - [ ] Check for conflicting dependency versions across apps
  - [ ] Verify peer dependencies are satisfied
  - [ ] Test that shared packages work with all apps

- [ ] **Custom build scripts**
  - [ ] Verify build scripts work in monorepo context
  - [ ] Check for hardcoded paths in build configurations
  - [ ] Test production build process

### 🗄️ Database & Data
- [ ] **Prisma schema conflicts**
  - [ ] Verify all models are included in consolidated schema
  - [ ] Check for conflicting field names or types
  - [ ] Test migrations don't break existing data

- [ ] **Seed data and fixtures**
  - [ ] Verify seed scripts work with new Prisma location
  - [ ] Check test fixtures are properly imported
  - [ ] Ensure development data is preserved

### 🌐 Frontend Routing & Assets
- [ ] **Static assets and public files**
  - [ ] Verify images and static files are accessible
  - [ ] Check for hardcoded asset paths
  - [ ] Test favicon and manifest files

- [ ] **Environment-specific configurations**
  - [ ] Verify Next.js environment variables
  - [ ] Check API base URLs are correct
  - [ ] Test different deployment environments

## 🔄 Migration Execution Checklist

### Pre-Migration
- [ ] **Backup all repositories**
  ```bash
  mkdir ~/omnifit-backup
  cd ~/omnifit-backup
  git clone https://github.com/JulianWilliams-Code/omnifit-frontend.git
  git clone https://github.com/JulianWilliams-Code/omnifit-backend.git
  git clone https://github.com/JulianWilliams-Code/omnifit-ai.git
  git clone https://github.com/JulianWilliams-Code/omnifit-blockchain.git
  ```

- [ ] **Create migration branch**
  ```bash
  cd /Users/julianwilliams/omnifit-monorepo
  git checkout -b migration/multi-repo-merge
  ```

- [ ] **Add remote repositories for history preservation**
  ```bash
  git remote add frontend https://github.com/JulianWilliams-Code/omnifit-frontend.git
  git remote add backend https://github.com/JulianWilliams-Code/omnifit-backend.git
  git remote add ai https://github.com/JulianWilliams-Code/omnifit-ai.git
  git remote add blockchain https://github.com/JulianWilliams-Code/omnifit-blockchain.git
  git fetch --all
  ```

### Migration Steps
- [ ] **Run automated migration script**
  ```bash
  node scripts/migrate-repos.js
  ```

- [ ] **Install dependencies and test**
  ```bash
  pnpm install
  pnpm db:generate
  pnpm build:packages
  ```

- [ ] **Run validation script**
  ```bash
  node scripts/validate-migration.js
  ```

- [ ] **Manual verification of high-risk items** (see above)

### Post-Migration Testing
- [ ] **Test each app individually**
  ```bash
  ./scripts/dev-commands.sh dev:frontend
  ./scripts/dev-commands.sh dev:backend
  ./scripts/dev-commands.sh dev:ai
  ./scripts/dev-commands.sh dev:blockchain
  ```

- [ ] **Test full system integration**
  ```bash
  ./scripts/dev-commands.sh dev
  ```

- [ ] **Run test suites**
  ```bash
  pnpm test
  pnpm lint
  ```

- [ ] **Test build process**
  ```bash
  pnpm build
  ```

- [ ] **Test Docker deployment**
  ```bash
  docker-compose up -d
  docker-compose logs
  ```

### Finalization
- [ ] **Commit migration changes**
  ```bash
  git add .
  git commit -m "feat: migrate multi-repo to monorepo structure

  - Consolidated 4 repositories into TurboRepo monorepo
  - Updated imports and package dependencies
  - Moved Prisma to packages/db
  - Consolidated environment variables
  - Updated TypeScript configurations

  🤖 Generated with Claude Code

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

- [ ] **Push migration branch**
  ```bash
  git push -u origin migration/multi-repo-merge
  ```

- [ ] **Create pull request for review**

- [ ] **Update CI/CD configurations**

- [ ] **Update documentation and README files**

## 🚨 Rollback Plan

If migration fails:

1. **Stop all services**
   ```bash
   docker-compose down
   pkill -f "pnpm\|node"
   ```

2. **Restore from backup**
   ```bash
   cd /Users/julianwilliams
   rm -rf omnifit-monorepo
   cp -r omnifit-backup/monorepo-backup-* omnifit-monorepo
   ```

3. **Continue using separate repositories until issues are resolved**

## 📞 Emergency Contacts

- **Technical Lead**: [Your contact information]
- **DevOps Team**: [DevOps contact information]
- **Database Admin**: [DBA contact information]

## 📝 Post-Migration TODO

- [ ] Update team documentation
- [ ] Train team members on monorepo workflows
- [ ] Update development environment setup guides
- [ ] Configure IDE/editor for monorepo development
- [ ] Update deployment documentation
- [ ] Schedule cleanup of old repositories (after 30 days)
- [ ] Monitor performance and identify optimizations
- [ ] Set up monorepo-specific monitoring and alerts

---

**Migration Date**: ___________  
**Performed By**: ___________  
**Reviewed By**: ___________  
**Approved By**: ___________