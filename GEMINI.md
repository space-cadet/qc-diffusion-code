# Project: QC-Diffusion Code
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-09-10 18:50:11 IST*

## Project Overview

This project is a sophisticated computational simulation system for studying finite velocity diffusion phenomena in quantum cosmological models. It's a monorepo that contains:

*   **Frontend:** A React-based application built with Vite and TypeScript for visualizing the simulations. It uses WebGL for GPU-accelerated PDE solving and provides a user-friendly interface with real-time parameter controls and dual visualization modes.
*   **Backend:** A Python-based server using the FastAPI framework. It likely handles WebSocket connections for real-time communication with the frontend and may perform some of the more intensive computations.
*   **Julia Code:** The `DynamicalBilliards.jl` directory contains a Julia project, likely for research and development of the physics models.

The project is well-structured and uses modern tools like `pnpm` for monorepo management, TypeScript for type safety, and `vitest` for testing.

## Simulation Details

### 2D Random Walk

The frontend application implements a 2D random walk simulation on the "Random Walk Sim" page. The core logic for the random walk is located in the `frontend/src/physics/strategies/` directory. For example, `CTRWStrategy2D.ts` implements a 2D Continuous Time Random Walk. In this file, the `handleCollision` function calculates a new, random 2D direction for each particle, and the `updateParticle` function updates the particle's position based on its velocity components.

### 1D PDE Solvers

The application also implements WebGL-based solvers for 1D partial differential equations. The implementation uses a strategy pattern, with different solvers available:

*   **Forward Euler:** An explicit method, implemented in `frontend/src/webgl/solvers/ForwardEulerSolver.ts`.
*   **Crank-Nicolson:** An implicit, unconditionally stable method, implemented in `frontend/src/webgl/solvers/CrankNicolsonSolver.ts`.

## Agent Instructions

This project contains a set of integrated rules and guidelines for the Gemini agent. These rules cover file modifications, session management, implementation workflows, and more. The full set of rules can be found in `memory-bank/integrated-rules-v6.8.md`.

## Building and Running

### Prerequisites

*   Node.js 18+
*   pnpm 8+
*   Python 3.9+ (for backend)

### Setup & Running

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the Frontend (Development Mode):**
    ```bash
    cd frontend
    pnpm dev
    ```

3.  **Run the Backend (Optional, for WebSocket features):**
    ```bash
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
    pip install -r requirements.txt
    python main.py
    ```

4.  **Run Frontend and Backend concurrently:**
    ```bash
    cd frontend
    pnpm run dev:full
    ```

### Building for Production

To create a production build of the frontend, run the following command from the root of the project:

```bash
pnpm build
```

## Development Conventions

*   **Monorepo:** The project is a monorepo using `pnpm` workspaces.
*   **TypeScript:** The frontend code is written in TypeScript with strict mode enabled.
*   **Testing:** The project uses `vitest` for testing. You can run tests using the following commands:
    *   Run all frontend tests: `cd frontend && pnpm test`
    *   Run all frontend tests in watch mode: `cd frontend && pnpm test:watch`
*   **Code Style:** The project uses ESLint with scientific computing rules to enforce code style.
*   **Documentation:** The `memory-bank/` directory contains comprehensive documentation, including technical implementation details, physics mathematical foundations, architecture decision records, and development session logs.
