from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import numpy as np
import asyncio
from solvers import compare_solutions

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.simulation_running = {}
        self.simulation_tasks = {}
        self.params = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.simulation_running[websocket] = False

    def disconnect(self, websocket: WebSocket):
        if websocket in self.simulation_tasks:
            self.simulation_tasks[websocket].cancel()
            del self.simulation_tasks[websocket]
        if websocket in self.simulation_running:
            del self.simulation_running[websocket]
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.floating):
            return float(obj)
        return super().default(obj)

async def stream_simulation(websocket: WebSocket, params: dict):
    """Stream simulation results frame by frame"""
    try:
        results = compare_solutions(params)
        telegraph_times = results['telegraph']['times']
        diffusion_times = results['diffusion']['times']
        
        # Use the shorter time series
        max_frames = min(len(telegraph_times), len(diffusion_times))
        
        for i in range(max_frames):
            if not manager.simulation_running.get(websocket, False):
                break
                
            frame_data = {
                "type": "animation_frame",
                "data": {
                    "time": telegraph_times[i],
                    "telegraph": {
                        "x": results['telegraph']['x'],
                        "u": results['telegraph']['solutions'][i]
                    },
                    "diffusion": {
                        "x": results['diffusion']['x'], 
                        "u": results['diffusion']['solutions'][i]
                    }
                }
            }
            
            await manager.send_personal_message(
                json.dumps(frame_data, cls=NumpyEncoder),
                websocket
            )
            
            await asyncio.sleep(0.1)  # 10 FPS animation
            
    except Exception as e:
        error_response = {
            "type": "error",
            "message": str(e)
        }
        await manager.send_personal_message(
            json.dumps(error_response),
            websocket
        )
    finally:
        import gc; gc.collect()

@router.websocket("/ws/simulate")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "start":
                params = message.get("params", {})
                manager.simulation_running[websocket] = True
                manager.params[websocket] = params
                
                # Cancel existing simulation if running
                if websocket in manager.simulation_tasks:
                    manager.simulation_tasks[websocket].cancel()
                
                # Start new simulation
                task = asyncio.create_task(stream_simulation(websocket, params))
                manager.simulation_tasks[websocket] = task
                
            elif message.get("type") == "stop":
                manager.simulation_running[websocket] = False
                if websocket in manager.simulation_tasks:
                    manager.simulation_tasks[websocket].cancel()
                    del manager.simulation_tasks[websocket]
                    
            elif message.get("type") == "pause":
                if manager.simulation_running.get(websocket, False):
                    # Pause simulation
                    manager.simulation_running[websocket] = False
                    if websocket in manager.simulation_tasks:
                        manager.simulation_tasks[websocket].cancel()
                else:
                    # Resume simulation
                    manager.simulation_running[websocket] = True
                    task = asyncio.create_task(stream_simulation(websocket, manager.params[websocket]))
                    manager.simulation_tasks[websocket] = task
                
                # Send confirmation
                await manager.send_personal_message(
                    json.dumps({
                        "type": "pause_state",
                        "data": {"isRunning": manager.simulation_running[websocket]}
                    }),
                    websocket
                )
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/api/status")
async def get_status():
    return {
        "status": "ready",
        "active_connections": len(manager.active_connections)
    }

@router.post("/api/initial")
async def get_initial_conditions(params: dict):
    """Get initial conditions frame for given parameters"""
    try:
        from solvers import get_initial_frame
        frame_data = get_initial_frame(params)
        return frame_data
    except Exception as e:
        return {"error": str(e)}
