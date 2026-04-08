from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.db.database import db
from app.core.deps import get_current_user

router = APIRouter(prefix="/records", tags=["records"])

RECORD_DISTANCES = {
    "1km": 1.0,
    "5km": 5.0,
    "10km": 10.0,
    "semi": 21.1,
    "marathon": 42.2,
}

async def check_and_update_records(user_id: str, run_doc: dict) -> list:
    """Check if a run breaks any personal records. Returns list of new records."""
    new_records = []
    distance = run_doc["distance"]
    duration = run_doc["duration"]
    splits = run_doc.get("splits", [])

    for label, target_km in RECORD_DISTANCES.items():
        if distance < target_km:
            continue

        if target_km == distance:
            record_time = duration
        elif splits:
            target_km_int = int(target_km)
            matching_splits = [s for s in splits if s.get("km") <= target_km_int]
            if matching_splits:
                record_time = sum(s.get("time", 0) for s in matching_splits)
                remaining = target_km - target_km_int
                if remaining > 0 and len(splits) > target_km_int:
                    record_time += splits[target_km_int - 1].get("time", 0) * remaining
            else:
                record_time = duration * (target_km / distance)
        else:
            record_time = duration * (target_km / distance)

        record_time = round(record_time, 1)
        record_pace = round((record_time / 60) / target_km, 2)

        existing = await db.personal_records.find_one(
            {"user_id": user_id, "category": label}, {"_id": 0}
        )

        is_new_record = existing is None or record_time < existing.get("time", float("inf"))

        if is_new_record:
            record_doc = {
                "user_id": user_id,
                "category": label,
                "distance_km": target_km,
                "time": record_time,
                "pace": record_pace,
                "run_id": run_doc["run_id"],
                "run_name": run_doc["name"],
                "previous_time": existing.get("time") if existing else None,
                "achieved_at": datetime.now(timezone.utc),
            }
            await db.personal_records.update_one(
                {"user_id": user_id, "category": label},
                {"$set": record_doc},
                upsert=True,
            )
            new_records.append({
                "category": label,
                "distance_km": target_km,
                "time": record_time,
                "pace": record_pace,
                "previous_time": existing.get("time") if existing else None,
                "improvement": round(existing["time"] - record_time, 1) if existing else None,
            })

    return new_records


@router.get("")
async def get_records(user: dict = Depends(get_current_user)):
    cursor = db.personal_records.find({"user_id": user["user_id"]}, {"_id": 0})
    records = await cursor.to_list(length=20)
    result = {}
    for label, target_km in RECORD_DISTANCES.items():
        found = next((r for r in records if r.get("category") == label), None)
        if found:
            result[label] = found
        else:
            result[label] = {"category": label, "distance_km": target_km, "time": None, "pace": None}
    return result

@router.get("/history")
async def get_record_history(user: dict = Depends(get_current_user)):
    """Get all runs that set a personal record, sorted by date"""
    cursor = db.personal_records.find(
        {"user_id": user["user_id"], "time": {"$ne": None}}, {"_id": 0}
    ).sort("achieved_at", -1)
    return await cursor.to_list(length=50)
