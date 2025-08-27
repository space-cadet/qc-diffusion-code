# Project: QC-Diffusion Code

## Project Overview

This project is a sophisticated computational simulation system for studying finite velocity diffusion phenomena in quantum cosmological models. It's a monorepo that contains:

*   **Frontend:** A React-based application built with Vite and TypeScript for visualizing the simulations. It uses WebGL for GPU-accelerated PDE solving and provides a user-friendly interface with real-time parameter controls and dual visualization modes.
*   **Backend:** A Python-based server using the FastAPI framework. It likely handles WebSocket connections for real-time communication with the frontend and may perform some of the more intensive computations.
*   **Julia Code:** The `DynamicalBilliards.jl` directory contains a Julia project, likely for research and development of the physics models.

The project is well-structured and uses modern tools like `pnpm` for monorepo management, TypeScript for type safety, and Jest for testing.

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
    pnpm run dev:full
    ```

### Building for Production

To create a production build of the frontend:

```bash
pnpm build
```

## Development Conventions

*   **Monorepo:** The project is a monorepo using `pnpm` workspaces.
*   **TypeScript:** The frontend code is written in TypeScript with strict mode enabled.
*   **Testing:** The project uses Jest for testing. You can run tests using the following commands:
    *   Run all tests: `pnpm test`
    *   Frontend unit tests: `cd frontend && pnpm test`
    *   Physics verification tests: `cd frontend && pnpm test -- physics`
*   **Code Style:** The project uses ESLint with scientific computing rules to enforce code style.
*   **Documentation:** The `memory-bank/` directory contains comprehensive documentation, including technical implementation details, physics mathematical foundations, architecture decision records, and development session logs.
