# OmniFit Monorepo

> Faith + Fitness + Token Rewards Platform - A comprehensive wellness ecosystem with blockchain incentives

## 🏗️ Monorepo Structure

This TurboRepo monorepo contains all OmniFit platform components in a single, efficiently managed workspace.

```
omnifit-monorepo/
├── apps/
│   ├── frontend/           # Next.js 14 user interface (Phase 1)
│   ├── backend/            # NestJS API server (Phase 1)
│   ├── ai/                 # AI orchestration service (Phase 2)
│   └── blockchain/         # Solana integration scripts (Phase 3)
├── packages/
│   ├── shared/             # Shared types & utilities
│   ├── ui/                 # Design system components
│   └── db/                 # Prisma database schema
└── infra/
    └── devops/             # Docker & deployment configs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd omnifit-monorepo
pnpm install

# Start local infrastructure
pnpm docker:up

# Set up database
pnpm db:push
pnpm db:seed

# Start all development servers
pnpm dev
```

### Development Workflow

```bash
# Build all packages and apps
pnpm build

# Run development servers with hot reload
pnpm dev

# Run tests across all packages
pnpm test

# Lint and format code
pnpm lint
pnpm format

# Type checking
pnpm typecheck
```

## 📱 Applications

### Frontend (`apps/frontend`)
- **Tech Stack**: Next.js 14 + TypeScript + Tailwind CSS
- **Features**: Landing page, auth, dashboard, partner portal
- **Local URL**: http://localhost:3000
- **Phase**: 1

### Backend (`apps/backend`) 
- **Tech Stack**: NestJS + TypeScript + Prisma + PostgreSQL
- **Features**: REST API, authentication, rewards system
- **Local URL**: http://localhost:3001
- **Phase**: 1

### AI Service (`apps/ai`)
- **Tech Stack**: Node.js + TypeScript + OpenAI
- **Features**: Content generation, coaching messages, automation
- **Local URL**: http://localhost:3002  
- **Phase**: 2

### Blockchain (`apps/blockchain`)
- **Tech Stack**: Solana + Anchor + TypeScript
- **Features**: Token minting, rewards distribution, staking
- **Network**: Devnet (safe for development)
- **Phase**: 3

## 📦 Shared Packages

### `packages/shared`
Common TypeScript types, utilities, and validation schemas used across all apps.

### `packages/ui` 
Design system components built with Tailwind CSS and React.

### `packages/db`
Prisma schema and database utilities shared between backend and other services.

## 🏃‍♂️ Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all code |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm docker:up` | Start local infrastructure |
| `pnpm db:push` | Push database schema |
| `pnpm db:seed` | Seed database with sample data |

## 🔧 Environment Setup

Each app has its own `.env.example` file. Copy and configure:

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env.local

# Frontend  
cp apps/frontend/.env.example apps/frontend/.env.local

# AI Service
cp apps/ai/.env.example apps/ai/.env.local

# Blockchain
cp apps/blockchain/.env.example apps/blockchain/.env.local
```

## 📊 Monitoring & Debugging

- **Database**: Prisma Studio at http://localhost:5555
- **API Documentation**: Swagger UI at http://localhost:3001/api/docs
- **Frontend**: Next.js dev tools
- **Logs**: `pnpm docker:logs` for infrastructure logs

## 🚢 Deployment

Each app includes Docker configuration for containerized deployment:

```bash
# Build production images
docker build -t omnifit/frontend apps/frontend
docker build -t omnifit/backend apps/backend
docker build -t omnifit/ai apps/ai
```

## 🧪 Testing Strategy

- **Unit Tests**: Jest/Vitest for individual components
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for user flows
- **Blockchain Tests**: Anchor test framework

## 📋 Phase Rollout Plan

### Phase 1: Core Platform (Q1 2024)
- ✅ Frontend landing & auth
- ✅ Backend API & database  
- ✅ Basic user registration
- ✅ Manual reward tracking

### Phase 2: AI Integration (Q2 2024)
- 🔄 AI coaching messages
- 🔄 Content generation
- 🔄 Automated notifications
- 🔄 Partner matching

### Phase 3: Blockchain (Q3 2024)  
- 📋 Token deployment
- 📋 Reward automation
- 📋 Staking mechanisms
- 📋 Partner incentives

### Phase 4: Advanced Features (Q4 2024)
- 📋 Mobile app
- 📋 Advanced analytics  
- 📋 Community features
- 📋 NFT achievements

### Phase 5: Enterprise (Q1 2025)
- 📋 White-label solutions
- 📋 Corporate partnerships
- 📋 Advanced compliance
- 📋 Global scaling

## 🤝 Contributing

1. Create feature branches from `main`
2. Follow conventional commits
3. Add tests for new features
4. Update documentation
5. Request code review

## 📚 Documentation

- [Roadmap](./ROADMAP.md) - Detailed phase planning
- [Migration Plan](./MIGRATION_PLAN.md) - Repository migration guide
- [Security Guide](./SECURITY.md) - Security practices
- [API Documentation](./apps/backend/README.md) - Backend API docs

## 🔗 Architecture Decisions

- **Monorepo**: TurboRepo for efficient builds and caching
- **TypeScript**: End-to-end type safety
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 14 with app router
- **Backend**: NestJS for scalable API architecture
- **Blockchain**: Solana for low-cost, fast transactions

## 🆘 Support

- [GitHub Issues](https://github.com/omnifit/monorepo/issues)
- [Discord Community](https://discord.gg/omnifit)
- [Documentation](https://docs.omnifit.com)

---

Built with ❤️ for sustainable wellness through technology