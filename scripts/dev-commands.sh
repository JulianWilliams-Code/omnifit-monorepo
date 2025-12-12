#!/bin/bash

# OmniFit Development Commands
# Run individual apps and services for testing

set -e

echo "🚀 OmniFit Development Helper Commands"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Help function
show_help() {
    echo ""
    echo "Available commands:"
    echo ""
    echo "Setup & Installation:"
    echo "  $0 install          - Install all dependencies"
    echo "  $0 setup            - Full setup (install + generate + migrate)"
    echo "  $0 clean            - Clean all node_modules and build artifacts"
    echo ""
    echo "Development:"
    echo "  $0 dev              - Start all services in development mode"
    echo "  $0 dev:frontend     - Start only frontend (Next.js)"
    echo "  $0 dev:backend      - Start only backend (NestJS)"
    echo "  $0 dev:ai          - Start only AI service"
    echo "  $0 dev:blockchain   - Start blockchain tools"
    echo ""
    echo "Building & Testing:"
    echo "  $0 build            - Build all packages and apps"
    echo "  $0 build:packages   - Build only shared packages"
    echo "  $0 test             - Run all tests"
    echo "  $0 lint             - Run linting on all packages"
    echo ""
    echo "Database:"
    echo "  $0 db:setup         - Setup database (generate + migrate)"
    echo "  $0 db:generate      - Generate Prisma client"
    echo "  $0 db:migrate       - Run database migrations"
    echo "  $0 db:studio        - Open Prisma Studio"
    echo "  $0 db:seed          - Seed database with sample data"
    echo ""
    echo "Docker:"
    echo "  $0 docker:up        - Start all services with Docker Compose"
    echo "  $0 docker:down      - Stop all Docker services"
    echo "  $0 docker:logs      - Show Docker logs"
    echo ""
    echo "Utilities:"
    echo "  $0 check            - Health check all services"
    echo "  $0 ports            - Show which ports are in use"
    echo "  $0 help             - Show this help message"
}

# Check if pnpm is installed
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install it first:"
        echo "npm install -g pnpm"
        exit 1
    fi
}

# Check if Docker is running (for docker commands)
check_docker() {
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    check_pnpm
    pnpm install
    print_success "Dependencies installed successfully!"
}

# Full setup
full_setup() {
    print_status "Running full setup..."
    install_deps
    
    print_status "Generating Prisma client..."
    pnpm db:generate
    
    print_status "Running database migrations..."
    pnpm db:migrate
    
    print_status "Building shared packages..."
    pnpm build:packages
    
    print_success "Setup completed successfully!"
}

# Clean all artifacts
clean_all() {
    print_warning "Cleaning all node_modules and build artifacts..."
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
    rm -rf .pnpm-store || true
    print_success "Cleanup completed!"
}

# Development servers
start_all_dev() {
    print_status "Starting all development servers..."
    check_pnpm
    pnpm dev
}

start_frontend() {
    print_status "Starting frontend development server..."
    check_pnpm
    echo "Frontend will be available at: http://localhost:3000"
    pnpm --filter=frontend dev
}

start_backend() {
    print_status "Starting backend development server..."
    check_pnpm
    echo "Backend will be available at: http://localhost:3001"
    echo "API docs will be available at: http://localhost:3001/api/docs"
    pnpm --filter=backend dev
}

start_ai() {
    print_status "Starting AI service..."
    check_pnpm
    echo "AI service will be available at: http://localhost:3002"
    pnpm --filter=ai dev
}

start_blockchain() {
    print_status "Starting blockchain tools..."
    check_pnpm
    echo "Available blockchain commands:"
    echo "  pnpm --filter=blockchain start token create-mint"
    echo "  pnpm --filter=blockchain start wallet create"
    echo "  pnpm --filter=blockchain start reward distribute --help"
    pnpm --filter=blockchain dev
}

# Building
build_all() {
    print_status "Building all packages and apps..."
    check_pnpm
    pnpm build
    print_success "Build completed successfully!"
}

build_packages() {
    print_status "Building shared packages..."
    check_pnpm
    pnpm --filter="@omnifit/*" build
    print_success "Shared packages built successfully!"
}

# Testing
run_tests() {
    print_status "Running all tests..."
    check_pnpm
    pnpm test
}

run_lint() {
    print_status "Running linting..."
    check_pnpm
    pnpm lint
}

# Database operations
db_setup() {
    print_status "Setting up database..."
    check_pnpm
    pnpm db:generate
    pnpm db:migrate
    print_success "Database setup completed!"
}

db_generate() {
    print_status "Generating Prisma client..."
    check_pnpm
    pnpm db:generate
    print_success "Prisma client generated!"
}

db_migrate() {
    print_status "Running database migrations..."
    check_pnpm
    pnpm db:migrate
    print_success "Migrations completed!"
}

db_studio() {
    print_status "Opening Prisma Studio..."
    check_pnpm
    echo "Prisma Studio will be available at: http://localhost:5555"
    pnpm db:studio
}

db_seed() {
    print_status "Seeding database..."
    check_pnpm
    pnpm db:seed
    print_success "Database seeded successfully!"
}

# Docker operations
docker_up() {
    print_status "Starting Docker services..."
    check_docker
    docker-compose up -d
    print_success "Docker services started!"
    echo ""
    echo "Services available at:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend: http://localhost:3001"
    echo "  AI Service: http://localhost:3002"
    echo "  Prisma Studio: http://localhost:5555"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis: localhost:6379"
}

docker_down() {
    print_status "Stopping Docker services..."
    check_docker
    docker-compose down
    print_success "Docker services stopped!"
}

docker_logs() {
    print_status "Showing Docker logs..."
    check_docker
    docker-compose logs -f
}

# Health check
health_check() {
    print_status "Checking service health..."
    
    # Check if ports are available
    check_port() {
        local port=$1
        local service=$2
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
            print_success "$service is running on port $port"
        else
            print_warning "$service is not running on port $port"
        fi
    }
    
    check_port 3000 "Frontend"
    check_port 3001 "Backend"
    check_port 3002 "AI Service"
    check_port 5432 "PostgreSQL"
    check_port 6379 "Redis"
    check_port 5555 "Prisma Studio"
}

# Show ports in use
show_ports() {
    print_status "Checking ports in use..."
    echo ""
    echo "OmniFit service ports:"
    echo "  3000 - Frontend (Next.js)"
    echo "  3001 - Backend (NestJS)"
    echo "  3002 - AI Service"
    echo "  5432 - PostgreSQL"
    echo "  6379 - Redis"
    echo "  5555 - Prisma Studio"
    echo ""
    echo "Currently listening ports:"
    lsof -i -P -n | grep LISTEN | grep -E ':(3000|3001|3002|5432|6379|5555)' || echo "  No OmniFit services currently running"
}

# Main command router
case "$1" in
    "install")
        install_deps
        ;;
    "setup")
        full_setup
        ;;
    "clean")
        clean_all
        ;;
    "dev")
        start_all_dev
        ;;
    "dev:frontend")
        start_frontend
        ;;
    "dev:backend")
        start_backend
        ;;
    "dev:ai")
        start_ai
        ;;
    "dev:blockchain")
        start_blockchain
        ;;
    "build")
        build_all
        ;;
    "build:packages")
        build_packages
        ;;
    "test")
        run_tests
        ;;
    "lint")
        run_lint
        ;;
    "db:setup")
        db_setup
        ;;
    "db:generate")
        db_generate
        ;;
    "db:migrate")
        db_migrate
        ;;
    "db:studio")
        db_studio
        ;;
    "db:seed")
        db_seed
        ;;
    "docker:up")
        docker_up
        ;;
    "docker:down")
        docker_down
        ;;
    "docker:logs")
        docker_logs
        ;;
    "check")
        health_check
        ;;
    "ports")
        show_ports
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