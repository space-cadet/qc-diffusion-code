from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router as websocket_router

app = FastAPI(title="QC Diffusion Simulations", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include WebSocket routes
app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"message": "QC Diffusion Simulation Server"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
