from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        # Maps room_id to a list of active WebSocket connections
        self.active_rooms: Dict[str, List[WebSocket]] = {}
        # Keeps track of rooms that have pending messages or active patients
        self.waiting_rooms: Set[str] = set()

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
        self.active_rooms[room_id].append(websocket)
        self.waiting_rooms.add(room_id)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_rooms:
            if websocket in self.active_rooms[room_id]:
                self.active_rooms[room_id].remove(websocket)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]
                if room_id in self.waiting_rooms:
                    self.waiting_rooms.remove(room_id)

    async def broadcast(self, message: str, room_id: str):
        if room_id in self.active_rooms:
            # We must handle cases where a socket is closed unexpectedly
            dead_sockets = []
            for connection in self.active_rooms[room_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.disconnect(dead, room_id)

manager = ConnectionManager()

# This is NOT under the /api/chat prefix, it's explicitly defined where it's included,
# but we are just making a websocket route here. We'll mount it accordingly.
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            # As soon as there's activity, make sure it's known as an active room
            manager.waiting_rooms.add(room_id)
            await manager.broadcast(data, room_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# Admin API to poll active patient waiting rooms
@router.get("/rooms")
def get_active_rooms():
    return {"rooms": list(manager.waiting_rooms)}
