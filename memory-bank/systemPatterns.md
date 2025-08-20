# System Patterns
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-08-20 08:31:32 IST*

## Architecture Overview
Client-server architecture with real-time communication for computational simulations.

## Core Patterns

### 1. WebSocket Communication Pattern
- **Backend**: FastAPI WebSocket endpoints for real-time data streaming
- **Frontend**: React hooks for WebSocket connection management
- **Use Case**: Streaming simulation results and parameter updates

### 2. Simulation Service Pattern
- **Location**: `backend/solvers.py`
- **Purpose**: Encapsulated PDE solving with py-pde library
- **Interface**: Async methods for simulation execution

### 3. Component-Based Visualization
- **Framework**: React with TypeScript
- **Visualization**: Plotly.js for scientific plotting
- **State Management**: React hooks for simulation state

### 4. CORS-Enabled API Pattern
- **Configuration**: Middleware for cross-origin requests
- **Development**: Frontend (port 5174) ↔ Backend (port 8000)
- **Security**: Configured for local development environment

## Development Patterns

### Backend Structure
```
backend/
├── main.py           # FastAPI application entry
├── api.py            # WebSocket routes and handlers
├── solvers.py        # PDE simulation logic
└── requirements.txt  # Python dependencies
```

### Frontend Structure
```
frontend/
├── src/              # React application source
├── package.json      # Node.js dependencies
├── vite.config.ts    # Build configuration
└── tsconfig.json     # TypeScript configuration
```

## Technology Stack
- **Backend**: Python, FastAPI, py-pde, NumPy, WebSockets
- **Frontend**: React, TypeScript, Vite, Plotly.js, Tailwind CSS
- **Communication**: WebSocket for real-time data exchange
- **Build**: Vite for frontend, uvicorn for backend development

## Design Principles
- Real-time simulation feedback through WebSocket streaming
- Separation of computation (backend) and visualization (frontend)
- Scientific computing focus with numerical accuracy
- Interactive parameter exploration capabilities
