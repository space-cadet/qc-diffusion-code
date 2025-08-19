from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import numpy as np
from solvers import compare_solutions

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
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

@router.websocket("/ws/simulate")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            params = json.loads(data)
            
            # Run simulation with received parameters
            try:
                results = compare_solutions(params)
                
                # Send results back to client
                response = {
                    "type": "simulation_result",
                    "data": results
                }
                
                await manager.send_personal_message(
                    json.dumps(response, cls=NumpyEncoder), 
                    websocket
                )
                
            except Exception as e:
                error_response = {
                    "type": "error",
                    "message": str(e)
                }
                await manager.send_personal_message(
                    json.dumps(error_response),
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
