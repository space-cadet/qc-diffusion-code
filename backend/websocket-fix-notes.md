# Fix WebSocket Path Mismatch

## Problem
Frontend connects to `ws://localhost:8000/ws/simulate` but backend serves WebSocket at `/ws/simulate` (not `/ws/simulate`).

Actually — the router is mounted at root, so `/ws/simulate` should work. Let me check if the router is properly included.

Looking at main.py: `app.include_router(websocket_router)` — this should mount the routes from api.py at the root.

In api.py: `@router.websocket("/ws/simulate")` — this creates a route at `/ws/simulate`.

So the full path should be `ws://localhost:8000/ws/simulate` which matches what the frontend uses.

But the 404 suggests the route isn't being registered. Let me check if there's a prefix issue.
