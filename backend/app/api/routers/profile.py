from fastapi import APIRouter, Depends
from app.db.database import db
from app.models.schemas import ProfileUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@router.put("")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.weight is not None:
        updates["weight"] = req.weight
    if req.height is not None:
        updates["height"] = req.height
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    updated.pop("password_hash", None)
    return updated
