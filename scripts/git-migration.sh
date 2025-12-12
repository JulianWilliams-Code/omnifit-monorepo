#!/bin/bash

# Git Migration Strategy for OmniFit Monorepo
# Preserves commit history from all repositories

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
REPOS=(
    "frontend:https://github.com/JulianWilliams-Code/omnifit-frontend.git:apps/frontend"
    "backend:https://github.com/JulianWilliams-Code/omnifit-backend.git:apps/backend"
    "ai:https://github.com/JulianWilliams-Code/omnifit-ai.git:apps/ai"
    "blockchain:https://github.com/JulianWilliams-Code/omnifit-blockchain.git:apps/blockchain"
)

# Help function
show_help() {
    echo "Git Migration Script for OmniFit Monorepo"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup-migration    - Setup migration branch and add remotes"
    echo "  preserve-history   - Import commit history from all repos"
    echo "  create-merge       - Create merge commits preserving history"
    echo "  finalize          - Finalize migration and push to remote"
    echo "  rollback          - Rollback migration changes"
    echo "  status            - Show migration status"
    echo "  help              - Show this help"
    echo ""
    echo "Full migration process:"
    echo "  $0 setup-migration"
    echo "  $0 preserve-history"
    echo "  $0 create-merge"
    echo "  $0 finalize"
}

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "turbo.json" || ! -f "pnpm-workspace.yaml" ]]; then
        print_error "Not in monorepo root directory"
        print_error "Please run this script from /Users/julianwilliams/omnifit-monorepo"
        exit 1
    fi
}

# Setup migration branch and remotes
setup_migration() {
    print_status "Setting up migration branch and remotes..."
    
    # Create and checkout migration branch
    git checkout -b migration/multi-repo-merge 2>/dev/null || git checkout migration/multi-repo-merge
    
    # Add remotes for each repository
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        
        print_status "Adding remote for $name..."
        git remote remove "$name" 2>/dev/null || true
        git remote add "$name" "$url"
        
        print_status "Fetching history from $name..."
        git fetch "$name" --no-tags
    done
    
    print_success "Migration setup completed!"
    print_status "Remotes added:"
    git remote -v | grep -E "(frontend|backend|ai|blockchain)"
}

# Preserve commit history from all repositories
preserve_history() {
    print_status "Preserving commit history from all repositories..."
    
    # Create temporary branches for each repo with path filtering
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        
        print_status "Processing history for $name..."
        
        # Create a branch for this repo's history
        git checkout -b "migration/$name-history" "$name/main" 2>/dev/null || \
        git checkout -b "migration/$name-history" "$name/master" 2>/dev/null || {
            print_warning "Could not find main/master branch for $name, trying default branch..."
            git checkout -b "migration/$name-history" "$name/HEAD"
        }
        
        # Use git filter-repo or git filter-branch to move files to correct paths
        if command -v git-filter-repo &> /dev/null; then
            print_status "Using git-filter-repo for $name..."
            git filter-repo --to-subdirectory-filter "$path" --force
        else
            print_warning "git-filter-repo not available, using git filter-branch..."
            git filter-branch --index-filter "
                git ls-files -s | sed \"s-\\t\\\"*-&$path/-\" |
                GIT_INDEX_FILE=\$GIT_INDEX_FILE.new git update-index --index-info &&
                if [ -f \"\$GIT_INDEX_FILE.new\" ]; then
                    mv \"\$GIT_INDEX_FILE.new\" \"\$GIT_INDEX_FILE\"
                fi
            " HEAD
        fi
        
        print_success "History processed for $name"
        git checkout migration/multi-repo-merge
    done
}

# Create merge commits preserving history
create_merge() {
    print_status "Creating merge commits with preserved history..."
    
    git checkout migration/multi-repo-merge
    
    # Merge each repository's history
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        
        print_status "Merging history from $name..."
        
        # Create merge commit with preserved history
        git merge "migration/$name-history" --no-edit --allow-unrelated-histories \
            -m "feat: merge $name repository history

Preserves commit history from $url
Files moved to $path/

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        print_success "Merged history for $name"
    done
    
    print_success "All repository histories merged!"
}

# Finalize migration
finalize_migration() {
    print_status "Finalizing migration..."
    
    # Ensure we're on migration branch
    git checkout migration/multi-repo-merge
    
    # Add any remaining changes from the migration script
    git add .
    
    if git diff --staged --quiet; then
        print_status "No additional changes to commit"
    else
        git commit -m "feat: finalize monorepo migration

Complete migration from multi-repo to TurboRepo monorepo:
- Consolidated 4 repositories with preserved history
- Updated package dependencies and imports
- Moved Prisma to packages/db
- Updated TypeScript configurations
- Consolidated environment variables

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
    
    # Push migration branch
    print_status "Pushing migration branch..."
    git push -u origin migration/multi-repo-merge
    
    print_success "Migration completed and pushed!"
    print_status "Next steps:"
    echo "1. Create a pull request to review the migration"
    echo "2. Test the migration thoroughly"
    echo "3. Merge to main branch when ready"
    echo "4. Clean up old repositories after successful deployment"
}

# Rollback migration
rollback_migration() {
    print_warning "Rolling back migration..."
    
    # Switch back to main branch
    git checkout main 2>/dev/null || git checkout master
    
    # Delete migration branch
    git branch -D migration/multi-repo-merge 2>/dev/null || true
    
    # Remove remote branches
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        git branch -D "migration/$name-history" 2>/dev/null || true
    done
    
    # Remove remotes
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        git remote remove "$name" 2>/dev/null || true
    done
    
    print_success "Migration rolled back"
}

# Show migration status
show_status() {
    print_status "Migration Status"
    echo ""
    
    # Current branch
    echo "Current branch: $(git branch --show-current)"
    echo ""
    
    # Check for migration branch
    if git show-ref --verify --quiet refs/heads/migration/multi-repo-merge; then
        print_success "Migration branch exists"
    else
        print_warning "Migration branch does not exist"
    fi
    
    # Check remotes
    echo ""
    echo "Repository remotes:"
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        if git remote get-url "$name" &>/dev/null; then
            print_success "$name remote configured"
        else
            print_warning "$name remote not configured"
        fi
    done
    
    # Check history branches
    echo ""
    echo "History branches:"
    for repo_config in "${REPOS[@]}"; do
        IFS=':' read -r name url path <<< "$repo_config"
        if git show-ref --verify --quiet "refs/heads/migration/$name-history"; then
            print_success "migration/$name-history exists"
        else
            print_warning "migration/$name-history does not exist"
        fi
    done
    
    # Show recent commits
    echo ""
    echo "Recent commits on current branch:"
    git log --oneline -5
}

# Main command handler
case "$1" in
    "setup-migration")
        check_directory
        setup_migration
        ;;
    "preserve-history")
        check_directory
        preserve_history
        ;;
    "create-merge")
        check_directory
        create_merge
        ;;
    "finalize")
        check_directory
        finalize_migration
        ;;
    "rollback")
        check_directory
        rollback_migration
        ;;
    "status")
        check_directory
        show_status
        ;;
    "help"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac