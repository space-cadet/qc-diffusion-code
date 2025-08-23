# QC-Diffusion Code Implementation

Advanced computational simulation system demonstrating finite velocity diffusion in quantum cosmology through stochastic random walk derivations.

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Key Features](#key-features)
- [Research Contributions](#research-contributions)
- [Installation](#installation)
- [Usage](#usage)
- [Physics Implementation](#physics-implementation)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Authors](#authors)

## Overview

This project implements sophisticated computational tools for studying finite velocity diffusion phenomena in quantum cosmological models. The work extends traditional diffusion equations to incorporate relativistic constraints and quantum mechanical effects, with emphasis on demonstrating the stochastic origins of telegraph equations through Continuous Time Random Walk (CTRW) simulations.

## Live Demo

- **Production Deployment**: [Vercel](https://qc-diffusion-code.vercel.app)
- **Repository**: [GitHub](https://github.com/space-cadet/qc-diffusion-code)

## Key Features

### Physics Engine
- Continuous Time Random Walk (CTRW) implementation with exponential collision timing
- Strategy pattern supporting multiple physics approaches (CTRW, Simple, Lévy, Fractional)
- WebGL GPU-accelerated PDE solving with 100x performance improvement
- Real-time density profile calculations with 2D spatial binning
- Observer pattern for numerical observables with lazy evaluation

### User Interface
- Professional React Grid Layout with draggable panels
- Real-time parameter controls with immediate visual feedback
- Dual visualization modes: particle simulation and graph networks
- Comprehensive state persistence across browser sessions
- Distribution controls (uniform, gaussian, ring, stripe, grid patterns)

### Production Features
- Monorepo architecture with pnpm workspace configuration
- Comprehensive Jest testing with mathematical verification
- TypeScript strict mode across entire codebase
- Automated CI/CD with Vercel deployment

## Research Contributions

### Theoretical Advances
- Numerical demonstration of random walk convergence to telegraph equation
- Coordinate system alignment between physics simulation and rendering spaces
- Density profile analysis for telegraph equation verification
- Strategy-agnostic boundary condition framework

### Technical Innovations
- Low-level particle control eliminating animation conflicts
- Modular physics engine enabling runtime strategy switching
- WebGL fragment shader PDE implementations
- Complete simulation state restoration with auto-save functionality

## Installation

### Prerequisites
- Node.js 18+
- pnpm 8+
- Python 3.9+ (for backend)

### Setup
```bash
# Clone repository
git clone https://github.com/space-cadet/qc-diffusion-code.git
cd qc-diffusion-code

# Install dependencies
pnpm install

# Start development server
cd frontend
pnpm dev

# Optional: Start backend for WebSocket features
cd ../backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Usage

### Basic Simulation
1. Navigate to the Random Walk tab
2. Adjust physics parameters (collision rate, jump length, velocity)
3. Select particle distribution pattern
4. Click Start to begin simulation
5. Monitor real-time density evolution and telegraph equation comparison

### Advanced Features
- Switch between continuum and graph simulation modes
- Adjust boundary conditions (periodic, reflective, absorbing)
- Export simulation data in multiple formats
- Save and restore simulation sessions

## Physics Implementation

### CTRW Mathematics
The Continuous Time Random Walk implementation follows:
- Collision times: τ ~ Exponential(λ)
- Jump lengths: Fixed step size a
- Velocity: v = a/⟨τ⟩
- Diffusion coefficient: D = v²/(2λ)

### Telegraph Equation
In appropriate scaling limits, the random walk converges to:
```
∂²u/∂t² + 2λ∂u/∂t = v²∇²u
```

### Strategy Pattern
Multiple physics implementations:
- CTRWStrategy: Exponential collision timing
- SimpleStrategy: Basic random walk
- LévyStrategy: Power-law jump distributions
- FractionalStrategy: Memory-dependent walks

## Architecture

### Frontend Structure
```
frontend/src/
├── components/          # UI components with state persistence
├── physics/             # Physics engine with strategy pattern
│   ├── strategies/      # Physics implementation strategies
│   ├── observables/     # Observer pattern observables
│   └── utils/           # Mathematical utilities
├── stores/              # Zustand state management
├── webgl/               # GPU-accelerated PDE solvers
└── hooks/               # Custom React hooks
```

### Monorepo Configuration
```
packages/
├── graph-core/          # Graph theory utilities
└── graph-ui/            # Graph visualization components
```

## Development

### Code Standards
- TypeScript strict mode
- ESLint with scientific computing rules
- Comprehensive JSDoc documentation
- Jest testing with mathematical verification

### Build System
- Vite with WebGL optimization
- pnpm workspace for monorepo management
- Automated dependency management
- Production optimization for Vercel deployment

## Testing

```bash
# Run all tests
pnpm test

# Frontend unit tests
cd frontend && pnpm test

# Physics verification tests
cd frontend && pnpm test -- physics
```

Test coverage includes:
- Unit tests for physics strategies
- Integration tests for UI components
- Mathematical verification against analytical solutions
- Performance benchmarks

## Deployment

### Production Build
```bash
# Build for production
pnpm build

# Preview build locally
pnpm preview
```

### Vercel Configuration
Production deployment uses:
- Monorepo build pipeline
- Automated dependency resolution
- WebGL capability detection
- Performance monitoring

## Documentation

Comprehensive documentation available in `memory-bank/`:
- Technical implementation details
- Physics mathematical foundations
- Architecture decision records
- Development session logs

## Authors

- **Deepak Vaid** - Principal Investigator
- **Rachel L. Maitra** - Wentworth Institute of Technology

---

*This project demonstrates advanced computational techniques for quantum cosmological research through interactive web-based simulations.*