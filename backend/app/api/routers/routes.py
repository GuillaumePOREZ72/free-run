import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from app.db.database import db
from app.models.schemas import RouteCreate
from app.core.deps import get_current_user

router = APIRouter(prefix="/routes", tags=["routes"])

@router.post("")
async def create_route(req: RouteCreate, user: dict = Depends(get_current_user)):
    route_id = f"route_{uuid.uuid4().hex[:12]}"
    route_doc = {
        "route_id": route_id,
        "user_id": user["user_id"],
        "name": req.name,
        "points": req.points,
        "distance": req.distance,
        "estimated_duration": req.estimated_duration,
        "created_at": datetime.now(timezone.utc),
    }
    await db.routes.insert_one(route_doc)
    route_doc.pop("_id", None)
    return route_doc

@router.get("")
async def list_routes(user: dict = Depends(get_current_user)):
    cursor = db.routes.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    routes = await cursor.to_list(length=100)
    return routes

@router.get("/{route_id}")
async def get_route(route_id: str, user: dict = Depends(get_current_user)):
    route = await db.routes.find_one({"route_id": route_id, "user_id": user["user_id"]}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.delete("/{route_id}")
async def delete_route(route_id: str, user: dict = Depends(get_current_user)):
    result = await db.routes.delete_one({"route_id": route_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}
