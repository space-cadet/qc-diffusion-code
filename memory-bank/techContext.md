# Technical Context
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-08-20 08:31:32 IST*

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
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1 for fast development
- **Package Manager**: pnpm 10.14.0
- **Port**: 5174 (Vite default)

### Key Dependencies
```
react & react-dom      # Core React framework
plotly.js              # Scientific visualization
typescript             # Type safety
tailwindcss            # Utility-first CSS
@types/*               # TypeScript definitions
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

## File Structure Context
```
code/
├── backend/
│   ├── .venv/           # Python virtual environment
│   ├── main.py          # FastAPI application
│   ├── api.py           # WebSocket routes
│   ├── solvers.py       # PDE simulation logic
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/             # React source code
│   ├── dist/            # Build output
│   ├── node_modules/    # Node dependencies
│   ├── package.json     # Project configuration
│   └── vite.config.ts   # Build configuration
└── visual-pde/          # External repository (independent)
```

## Integration Points
- **WebSocket Communication**: Backend streams simulation data to frontend
- **CORS Configuration**: Allows frontend-backend communication in development
- **Type Safety**: TypeScript ensures type consistency across components
- **Scientific Computing**: py-pde provides robust PDE solving capabilities
