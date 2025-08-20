# Project Brief
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-08-20 08:31:32 IST*

## Project Overview
**Name**: QC-Diffusion Code Implementation
**Purpose**: Computational simulation and visualization of finite velocity diffusion in quantum cosmology and quantum gravity
**Authors**: Deepak Vaid, Rachel L. Maitra (Wentworth Institute of Technology)

## Research Context
This project implements computational tools for studying finite velocity diffusion phenomena in quantum cosmological models and quantum gravity theories. The work extends traditional diffusion equations to incorporate relativistic constraints and quantum mechanical effects.

## Technical Scope
### Core Components
1. **Backend**: Python FastAPI server with WebSocket support for real-time PDE simulations
2. **Frontend**: React/TypeScript web application with Plotly.js for interactive visualization

### External Dependencies
- **visual-pde**: Independent repository included as reference/submodule (not part of main development)

## Project Structure
```
code/
├── backend/          # Python simulation server
├── frontend/         # React visualization client  
├── visual-pde/       # External repo (independent)
└── memory-bank/      # Project management system
```

## Development Goals
- Create interactive simulation environment for quantum diffusion models
- Provide real-time visualization of PDE solutions
- Support parameter exploration and analysis workflows
- Enable research collaboration through web-based interface

## Current Phase
Initial development and setup of simulation infrastructure
