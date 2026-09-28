# QC-Diffusion Code — Agent Guide

> This file is for AI coding agents. Human contributors should start with `README.md`.

## Project Overview

QC-Diffusion Code is a computational simulation system that studies finite-velocity diffusion phenomena in quantum cosmology through stochastic random-walk derivations. It is an interactive web application with a React/TypeScript frontend, an optional Python/FastAPI backend for WebSocket-driven PDE simulations, and a monorepo of shared TypeScript packages for graph theory and quantum utilities.

Key research goal: numerically demonstrate that Continuous Time Random Walk (CTRW) converges to the telegraph equation in appropriate scaling limits.

The live production deployment is on Vercel at `https://qc-diffusion-code.vercel.app`.

## Technology Stack

- **Package manager**: pnpm (v10.14.0+) with workspace configuration
- **Frontend**: React 18, TypeScript 5.8 (strict mode), Vite 5, Tailwind CSS 3
- **State management**: Zustand (with `persist` middleware for session storage)
- **Physics / Math**: Custom physics engine, mathjs, expr-eval, gpu-io, three.js
- **Visualization**: Plotly.js, react-plotly.js, sigma.js / @react-sigma/core for graph networks, tsparticles for particle rendering
- **WebGL**: Custom fragment-shader PDE solvers, gpu-io integration, WebGL particle renderers
- **Backend (optional)**: Python 3.9+, FastAPI, uvicorn, py-pde, numpy, websockets
- **Testing**: Vitest (primary), Jest (legacy/jsdom config present), jsdom environment
- **Linting**: ESLint with TypeScript, react-hooks, react-refresh plugins

## Monorepo Structure

```
qc-diffusion-code/
├── pnpm-workspace.yaml          # Workspace: frontend, backend, packages/*
├── package.json                 # Root scripts: build, clean, index
├── tsconfig.json                # Shared TypeScript base config
├── vercel.json                  # Vercel deployment config (SPA rewrite + asset caching)
│
├── frontend/                    # Main Vite React app
│   ├── package.json
│   ├── vite.config.ts           # Dev port 5174, WebSocket proxy to :8000, manual chunks
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── jest.config.js           # ts-jest + jsdom (legacy)
│   ├── eslint.config.js
│   └── src/
│       ├── App.tsx              # Tab router: PDE Sim, Random Walk, Quantum Walk, Lab Demo, Simplicial Growth, Memory Bank
│       ├── main.tsx             # React root entry
│       ├── stores/              # Zustand stores (appStore.ts is the main one)
│       ├── hooks/               # Custom React hooks for physics, WebGL, density visualization, etc.
│       ├── components/          # React UI components (panels, charts, canvas wrappers)
│       ├── physics/             # Physics engine (strategy pattern, observables, core, utils, types, __tests__)
│       ├── webgl/               # WebGL PDE solvers, shaders, boundary conditions, __tests__
│       ├── gpu/                 # GPU-accelerated particle/collision managers (gpu-io)
│       ├── lab/                 # Simplicial complex lab demo (geometry, algebraic topology, Pachner moves)
│       ├── memoryBank/          # Memory Bank UI components/pages
│       ├── types/               # Shared TypeScript type definitions
│       └── utils/               # Utility modules (initial conditions, conservation monitor)
│
├── backend/                     # Optional FastAPI server
│   ├── main.py                  # FastAPI app entry (port 8000, CORS for localhost:5174)
│   ├── api.py                   # WebSocket `/ws/simulate` + REST `/api/status`, `/api/initial`
│   ├── solvers.py               # TelegraphSolver & DiffusionSolver using py-pde
│   └── requirements.txt
│
├── packages/
│   ├── ts-quantum/              # Quantum mechanics TypeScript library (published package)
│   ├── graph-core/              # @spin-network/graph-core — graph theory utilities (vite build)
│   └── graph-ui/                # @spin-network/graph-ui — graph visualization React components (tsup build)
│
├── scripts/                     # Debugging, testing, and screenshot automation scripts (TypeScript/Node)
├── memory-bank/                 # Project documentation, session logs, edit history, templates
└── DynamicalBilliards.jl/       # Julia package (separate codebase, not part of build)
```

## Build & Development Commands

All commands assume you are in the project root and have run `pnpm install`.

### Root-level commands

```bash
# Install all workspace dependencies
pnpm install

# Build the entire project for production (builds packages in order, then frontend)
pnpm build

# Clean all build artifacts across workspace
pnpm clean

# Run the file indexer script
pnpm index
```

### Frontend commands (`cd frontend`)

```bash
# Start dev server (port 5174)
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Run tests (Vitest)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Start dev server + Python backend together
pnpm dev:full
```

### Package commands

```bash
# ts-quantum
cd packages/ts-quantum && pnpm build   # Dual CJS + ESM build
cd packages/ts-quantum && pnpm test    # Vitest (node env)

# graph-core
cd packages/graph-core && pnpm build   # Vite library build
cd packages/graph-core && pnpm test    # Vitest

# graph-ui
cd packages/graph-ui && pnpm build     # tsup
cd packages/graph-ui && pnpm test      # Vitest
```

### Backend commands (`cd backend`)

```bash
# Create venv and install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server (port 8000, reload enabled)
python main.py
```

## Code Organization Conventions

### Physics Engine (`frontend/src/physics/`)

The physics engine uses a **strategy pattern** with clear separation of concerns:

- `interfaces/` — `PhysicsStrategy`, `Observable` contracts
- `strategies/` — Concrete implementations:
  - `CTRWStrategy1D`, `CTRWStrategy2D` — exponential collision timing
  - `BallisticStrategy` — ballistic motion
  - `InterparticleCollisionStrategy1D`, `InterparticleCollisionStrategy2D` — collision handling
  - `CompositeStrategy` — strategy composition
- `core/` — Engine orchestration:
  - `PhysicsEngine.ts` — main loop, time manager, coordinate system, strategy orchestrator
  - `CoordinateSystem.ts` — authoritative physics↔canvas coordinate mapping
  - `BoundaryManager.ts` — boundary condition enforcement
  - `TimeManager.ts` — simulation time advancement
  - `StrategyOrchestrator.ts` — strategy execution pipeline
  - `GlobalTime.ts` — unified simulation time exposure
- `observables/` — Observer-pattern numerical observables (MSD, kinetic energy, momentum, particle count, expression evaluator, text parser)
- `utils/` — Mathematical utilities (density calculation, spatial grid, circular buffer, initial distributions, thermal velocities, vectors, boundary utilities)
- `types/` — Domain types (`Particle`, `CollisionEvent`, `BoundaryConfig`, `DensityField`, `PhysicsContext`)
- `__tests__/` — Unit and integration tests for physics modules

### WebGL / GPU (`frontend/src/webgl/` and `frontend/src/gpu/`)

- `webgl/solvers/` — PDE solvers: `ForwardEulerSolver`, `CrankNicolsonSolver`, `LaxWendroffSolver`
- `webgl/boundary-conditions/` — `BaseBoundaryCondition`, `DirichletBC`, `NeumannBC`
- `webgl/shaders/` — GLSL fragment/vertex shaders for particle rendering
- `gpu/lib/` — GPU parameter sync, spatial grid, collision metrics, color utilities

### State Management

- **Zustand** is used for all global state.
- `appStore.ts` is the primary store and includes `persist` middleware to save simulation parameters and UI state across browser sessions.
- Local component state is used for ephemeral UI concerns.

### Component Conventions

- Components are PascalCase files in `frontend/src/components/`.
- Common reusable UI primitives live in `frontend/src/components/common/`.
- Page-level components are at the root of `frontend/src/` (e.g., `QuantumWalkPage.tsx`, `SimplicialGrowthPage.tsx`).
- Lazy loading is used for all major tab pages in `App.tsx` to reduce initial bundle size.

## Testing Strategy

The project has two test runners:

1. **Vitest** (preferred) — used in frontend and all packages.
2. **Jest** (legacy) — config exists at `frontend/jest.config.js` but active tests are primarily Vitest.

### Test locations

- `frontend/src/physics/__tests__/` — Physics engine unit tests (coordinate system, CTRW strategy, expression evaluator, circular buffer, integration, two-phase engine)
- `frontend/src/webgl/__tests__/` — WebGL boundary condition tests
- `frontend/src/lab/simplicial/__tests__/` — Simplicial complex / Pachner move tests
- `packages/*/src/` or package roots — Package-level tests

### Running tests

```bash
# All frontend tests
 cd frontend && pnpm test

# Physics-specific tests
 cd frontend && pnpm test -- physics

# WebGL tests
 cd frontend && pnpm test -- webgl

# Package tests
 cd packages/ts-quantum && pnpm test
 cd packages/graph-core && pnpm test
 cd packages/graph-ui && pnpm test
```

## Code Style Guidelines

- **TypeScript strict mode** is enabled in `tsconfig.json`.
- **ESLint** config: `@eslint/js` recommended + TypeScript recommended + react-hooks recommended-latest + react-refresh (Vite).
- Use explicit types for public APIs; inferred types are acceptable for locals.
- Physics code uses explicit interfaces (`PhysicsStrategy`, `Observable`) to enable runtime strategy switching.
- Prefer `const` and immutable patterns; use `readonly` where appropriate.
- Physics/mathematical code uses `console.debug` for diagnostic logging.
- The codebase contains both `.ts` and generated `.js`/`.d.ts` artifacts side-by-side in `src/` because some packages emit declarations alongside source. Do not delete `.d.ts` files unless you are sure they are not import targets.

## Deployment

- **Primary target**: Vercel
- `vercel.json` configures:
  - `pnpm install --frozen-lockfile` for install
  - `pnpm build` for build
  - `frontend/dist` as output directory
  - SPA rewrite (`/(.*)` → `/index.html`)
  - Long-term cache headers for `/assets/*`
- The backend is **not** deployed to Vercel; it is an optional local development server.

## Security Considerations

- The FastAPI backend enables CORS for `http://localhost:5174` only. Update this if deploying the backend elsewhere.
- No authentication is implemented; this is a research simulation tool intended for local or public demo use.
- Do not commit `.env` files or API keys. `.env.local` and `.env.preview.local` are already ignored.
- The `buffer`, `stream-browserify`, and `util` polyfills are included for browser compatibility with certain math/plotting libraries.

## Key Dependencies & Gotchas

- **pnpm workspace**: packages are referenced via `workspace:*`. Always install from root so workspace links resolve.
- **Vite manual chunks**: The build splits vendor libraries into chunks (`vendor`, `plotly`, `three`, `particles`, `graph`, `math`, `utils`). If you add a large dependency, consider adding it to a chunk.
- **WebSocket proxy**: During development, `/ws` is proxied to `ws://localhost:8000`. The backend must be running for real-time PDE comparison features.
- **py-pde**: The Python backend depends on `py-pde` for PDE solving. It can be sensitive to NumPy version pinning (`numpy==1.24.3`).
- **tsParticles**: Some tsParticles packages require native builds and are listed in `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- **Node memory**: The root build script sets `NODE_OPTIONS="--max-old-space-size=4096"` because the Plotly/Three.js bundles are large.

## Useful Scripts in `/scripts`

- `run-random-walk.ts` / `run-random-walk-debug.ts` — Headless Playwright automation for random walk screenshots
- `run-webgl-test.ts` — WebGL solver screenshot verification
- `debug-loading.ts` / `debug-network.ts` / `debug-analysis.ts` — Diagnostic helpers for frontend loading and network issues
- `capture-tabs.ts` — Multi-tab screenshot capture
- `screenshot-verification.js` — Screenshot comparison utility

## Documentation

Complementary documentation lives in `memory-bank/`:
- `activeContext.md` — Current development context
- `progress.md` — Progress tracking
- `tasks.md` — Task lists
- `techContext.md` — Technical architecture notes
- `implementation-details/` — Deep-dive docs for specific features
- `sessions/` — Development session logs
