import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from app.db.database import db
from app.models.schemas import RunCreate
from app.core.deps import get_current_user
from app.api.routers.records import check_and_update_records

router = APIRouter(prefix="/runs", tags=["runs"])

@router.post("")
async def create_run(req: RunCreate, user: dict = Depends(get_current_user)):
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    avg_speed = (req.distance / (req.duration / 3600)) if req.duration > 0 else 0
    avg_pace = (req.duration / 60) / req.distance if req.distance > 0 else 0
    weight = user.get("weight", 70)
    calories = req.calories if req.calories else weight * req.distance * 1.036

    run_doc = {
        "run_id": run_id,
        "user_id": user["user_id"],
        "route_id": req.route_id,
        "name": req.name,
        "points": req.points,
        "distance": round(req.distance, 2),
        "duration": round(req.duration, 1),
        "avg_speed": round(avg_speed, 2),
        "avg_pace": round(avg_pace, 2),
        "elevation_gain": round(req.elevation_gain or 0, 1),
        "elevation_loss": round(req.elevation_loss or 0, 1),
        "splits": req.splits or [],
        "calories": round(calories, 0),
        "created_at": datetime.now(timezone.utc),
    }
    await db.runs.insert_one(run_doc)
    run_doc.pop("_id", None)

    # Check personal records
    new_records = await check_and_update_records(user["user_id"], run_doc)
    run_doc["new_records"] = new_records

    return run_doc

@router.get("")
async def list_runs(user: dict = Depends(get_current_user)):
    cursor = db.runs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    runs = await cursor.to_list(length=200)
    return runs

@router.get("/stats")
async def run_stats(user: dict = Depends(get_current_user)):
    cursor = db.runs.find({"user_id": user["user_id"]}, {"_id": 0})
    runs = await cursor.to_list(length=1000)
    total_distance = sum(r.get("distance", 0) for r in runs)
    total_duration = sum(r.get("duration", 0) for r in runs)
    total_calories = sum(r.get("calories", 0) for r in runs)
    total_elevation = sum(r.get("elevation_gain", 0) for r in runs)
    best_pace = min((r.get("avg_pace", 999) for r in runs), default=0)
    longest_run = max((r.get("distance", 0) for r in runs), default=0)
    return {
        "total_runs": len(runs),
        "total_distance": round(total_distance, 2),
        "total_duration": round(total_duration, 1),
        "total_calories": round(total_calories, 0),
        "total_elevation": round(total_elevation, 1),
        "best_pace": round(best_pace, 2) if best_pace < 999 else 0,
        "longest_run": round(longest_run, 2),
        "avg_distance": round(total_distance / len(runs), 2) if runs else 0,
    }

@router.get("/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    run = await db.runs.find_one({"run_id": run_id, "user_id": user["user_id"]}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@router.delete("/{run_id}")
async def delete_run(run_id: str, user: dict = Depends(get_current_user)):
    result = await db.runs.delete_one({"run_id": run_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"message": "Run deleted"}
