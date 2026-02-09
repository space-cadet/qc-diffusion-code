# Python Backend Development Environment Setup

*Created: 2026-02-09 20:51:40 IST*
*Last Updated: 2026-02-09 20:51:40 IST*
*Task: T32*

## Overview

Setup guide for Python backend development environment with conda/venv configuration, dependency management, and deployment separation from Vercel frontend.

## Environment Setup

### Option 1: Conda (Recommended for Scientific Computing)

```bash
# Create conda environment
conda create -n qc-diffusion python=3.10 -y
conda activate qc-diffusion

# Install dependencies
cd backend
pip install -r requirements.txt
```

**Why Conda**: Better for scientific packages (py-pde, numpy, scipy) with complex dependency chains.

### Option 2: Virtual Environment (venv)

```bash
# Create virtual environment
cd backend
python3.10 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Dependencies

Current `backend/requirements.txt`:
- `fastapi==0.104.1` - Web framework
- `uvicorn==0.24.0` - ASGI server  
- `py-pde==0.35.0` - PDE solver library
- `numpy==1.24.3` - Numerical computing
- `websockets==12.0` - WebSocket support
- `python-multipart==0.0.6` - Form data parsing

## Common Issues and Solutions

### Module Import Error: `No module named 'pde'`

**Problem**: `py-pde` package installs as `pde` module but import fails.

**Solutions**:
1. **Check installation**:
   ```bash
   python -c "import pde; print(pde.__file__)"
   ```

2. **Force reinstall**:
   ```bash
   pip uninstall py-pde
   pip install py-pde==0.35.0 --force-reinstall --no-cache-dir
   ```

3. **Alternative import**:
   ```python
   # In solvers.py, try:
   import py_pde as pde
   ```

### Conda in Package.json Scripts

**Problem**: `conda activate` doesn't work in subshells/scripts.

**Solution**: Use `conda run`:
```json
{
  "scripts": {
    "dev:full": "concurrently \"cd ../backend && conda run -n qc-diffusion python main.py\" \"pnpm dev\""
  }
}
```

**Deployment Note**: Never use conda commands in deployment scripts - Vercel doesn't support conda.

## Development Workflow

### Local Full-Stack Development

```bash
# Terminal 1: Backend
conda activate qc-diffusion
cd backend
python main.py

# Terminal 2: Frontend  
cd frontend
pnpm dev
```

### Single Command Development

```bash
cd frontend
pnpm dev:full  # Runs both backend and frontend
```

## Deployment Architecture

### Frontend: Vercel (Static Hosting)
- React application deployed to Vercel
- No server-side capabilities
- Static files only

### Backend: Separate Hosting
Deploy Python FastAPI to:
- **Railway** (recommended for FastAPI)
- **Render**
- **AWS EC2/ECS**
- **DigitalOcean**

### Environment Configuration

```typescript
// Frontend config
const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-domain.com' 
    : 'http://localhost:8000',
  wsUrl: process.env.NODE_ENV === 'production' 
    ? 'wss://your-backend-domain.com/ws' 
    : 'ws://localhost:8000/ws'
}
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

## Troubleshooting

### Python Version Issues
- Use Python 3.9-3.11 for best compatibility
- py-pde==0.35.0 may have issues with newer NumPy versions

### Dependency Conflicts
- Use conda for complex scientific dependencies
- Pin specific versions to avoid conflicts
- Clean reinstall: `pip uninstall -r requirements.txt && pip install -r requirements.txt`

### Port Conflicts
- Backend defaults to port 8000
- Frontend defaults to port 5173
- Change if conflicts occur

## Performance Considerations

- **Conda**: Slower package installation but better dependency resolution
- **venv**: Faster setup but may require manual dependency conflict resolution
- **py-pde**: Heavy library; consider lazy loading for better startup

## Security Notes

- Never commit `.env` files
- Use different API keys for development/production
- Enable CORS only for trusted domains in production
