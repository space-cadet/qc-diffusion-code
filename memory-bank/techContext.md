# Technical Context
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-09-03 17:37:30 IST*

## Backend Technical Details

### FastAPI Application
- **Entry Point**: `main.py`
- **Server**: uvicorn with hot reload for development
- **Port**: 8000 (configurable)
- **CORS**: Enabled for localhost:5174 (Vite frontend)

### Dependencies
```
fastapi==0.104.1       # Web framework
uvicorn==0.24.0        # ASGI server
py-pde==0.35.0         # PDE simulation library
numpy==1.24.3          # Numerical computing
websockets==12.0       # WebSocket support
python-multipart==0.0.6  # Form data handling
```

### API Structure
- **Health Check**: `/health` endpoint for monitoring
- **WebSocket**: Real-time communication for simulations
- **Router**: Modular API organization via `api.py`

## Frontend Technical Details

### React Application
- **Framework**: React 18.3.1 with TypeScript 5.5.3 in strict mode
- **Build Tool**: Vite 5.4.1 with WebGL optimization and shader loading
- **Package Manager**: pnpm 10.14.0 with monorepo workspace configuration
- **Deployment**: Vercel with production build pipeline
- **Testing**: Jest with comprehensive unit and integration tests

### Advanced Dependencies
```
# Physics and visualization
tsparticles             # Real-time particle system with custom physics
@sigma/node             # Graph network visualization
@spin-network/graph-core # Graph theory utilities
plotly.js               # Scientific 3D visualization

# State management and UI
zustand                 # Persistent state management
react-grid-layout       # Professional draggable panel interface
@dnd-kit/core          # Advanced drag-and-drop system
tailwindcss            # Modern utility-first CSS

# Mathematical computing
mathjs                 # Mathematical expression evaluation
lodash                 # Functional programming utilities
jest                   # Testing with mathematical verification
```

### Build Configuration
- **TypeScript**: Strict mode with separate configs for app and build tools
- **Vite**: ES modules with React plugin and optimized builds
- **PostCSS**: Tailwind CSS processing
- **Development**: Concurrent backend/frontend execution via `dev:full`

## Development Environment

### Python Environment
- **Virtual Environment**: `.venv` in backend directory
- **Python Version**: Compatible with py-pde 0.35.0
- **Activation**: `source .venv/bin/activate`

### Node Environment
- **Package Manager**: pnpm with workspace configuration
- **Node Version**: Compatible with TypeScript 5.5.3
- **Development**: Hot reload enabled for both frontend and backend

### Concurrent Development
```bash
# Frontend package.json script
"dev:full": "concurrently \"cd ../backend && source .venv/bin/activate && python main.py\" \"pnpm dev\""
```

## Advanced File Structure
```
qc-diffusion-code/
├── backend/
│   ├── .venv/              # Python virtual environment
│   ├── main.py             # FastAPI application with production config
│   ├── api.py              # WebSocket routes with state management
│   ├── solvers.py          # PDE simulation with conservation monitoring
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Advanced UI components
│   │   │   ├── ParameterPanel.tsx    # Physics parameter controls
│   │   │   ├── ParticleCanvas.tsx    # Real-time visualization
│   │   │   └── ObservablesPanel.tsx  # Numerical observable tracking
│   │   ├── physics/        # Comprehensive physics engine
│   │   │   ├── strategies/ # Strategy pattern implementations
│   │   │   ├── observables/ # Observer pattern observables
│   │   │   └── utils/      # Mathematical utilities
│   │   ├── stores/         # Zustand state management
│   │   ├── webgl/          # GPU-accelerated PDE solvers
│   │   └── hooks/          # Custom React hooks
│   ├── package.json        # Monorepo package configuration
│   └── vite.config.ts      # Advanced build configuration
├── packages/               # Shared monorepo packages
│   ├── graph-core/         # Graph theory utilities
│   └── graph-ui/           # Graph visualization components
├── pnpm-workspace.yaml     # Monorepo workspace configuration
├── vercel.json             # Production deployment configuration
└── memory-bank/            # Comprehensive project management
```

## Advanced Integration Architecture

### Physics Engine Integration
- **Dual Engine Architecture**: Runtime-switchable legacy and new physics engines with feature flag system
- **Strategy Pattern**: Modular physics implementations (CTRW, Simple, Lévy, Fractional) with PhysicsStrategy and RandomWalkStrategy interfaces
- **Observer Pattern**: Lazy evaluation system for numerical observables with text-based custom observables and unified polling
- **Coordinate System**: Clean separation between physics (-200,+200) and canvas (0,width) coordinates with proper transformations
- **WebGL Acceleration**: Fragment shader-based PDE solving with 100x performance improvement
- **Engine Selection UI**: Runtime toggle button in page header with persistent state management

### State Management Integration
- **Zustand Persistence**: Complete application state with localStorage integration
- **Auto-save System**: Periodic state saving (2-second intervals) during simulation
- **Session Restoration**: Full simulation state recovery across browser sessions
- **UI Persistence**: Grid layout positions and panel states preserved

### Visualization Integration
- **Dual Rendering**: tsParticles for continuum, Sigma.js for graph networks
- **Real-time Synchronization**: Physics calculations synchronized with visual updates
- **Mathematical Accuracy**: Proper coordinate transformations and density calculations
- **Performance Optimization**: 60fps animation with efficient memory management

### Production Deployment
- **Monorepo Architecture**: pnpm workspace with shared package dependencies
- **Vercel Integration**: Optimized build pipeline with automated CI/CD
- **Cross-platform Support**: WebGL acceleration with graceful fallbacks
- **Error Handling**: Comprehensive error boundaries with user-friendly messaging

### Mathematical Computing
- **CTRW Implementation**: Continuous Time Random Walk with exponential collision timing
- **Conservation Monitoring**: Real-time mass and energy conservation tracking
- **Density Calculations**: 2D spatial binning for telegraph equation verification
- **Statistical Analysis**: Box-Muller transform, Poisson processes, spatial moments
