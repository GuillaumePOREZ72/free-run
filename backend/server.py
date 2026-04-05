from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import math
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

app = FastAPI()

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = mongo_client[os.environ.get("DB_NAME", "runtracker")]


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try JWT first
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise jwt.InvalidTokenError()
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        pass

    # Try session token (Google Auth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user

    raise HTTPException(status_code=401, detail="Invalid token")


# ─── Models ───
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RouteCreate(BaseModel):
    name: str
    points: list
    distance: float
    estimated_duration: Optional[float] = None

class RunCreate(BaseModel):
    route_id: Optional[str] = None
    name: str
    points: list
    distance: float
    duration: float
    elevation_gain: Optional[float] = 0
    elevation_loss: Optional[float] = 0
    splits: Optional[list] = []
    calories: Optional[float] = 0

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None


# ─── Startup ───
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await seed_admin()

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@runtracker.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if existing is None:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "weight": 70,
            "height": 175,
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )


# ─── Auth ───
@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": "user",
        "weight": 70,
        "height": 175,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"user_id": user_id, "email": email, "name": req.name, "role": "user"}

@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
            else:
                await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = user["user_id"]
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"user_id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@app.get("/api/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(payload["sub"], user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── Google OAuth (Emergent Auth) ───
@app.post("/api/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data["email"].lower()
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": "user",
            "weight": 70,
            "height": 175,
            "created_at": datetime.now(timezone.utc),
        })

    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user.pop("password_hash", None)
    return user


# ─── Routes (planned routes) ───
@app.post("/api/routes")
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

@app.get("/api/routes")
async def list_routes(user: dict = Depends(get_current_user)):
    cursor = db.routes.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    routes = await cursor.to_list(length=100)
    return routes

@app.get("/api/routes/{route_id}")
async def get_route(route_id: str, user: dict = Depends(get_current_user)):
    route = await db.routes.find_one({"route_id": route_id, "user_id": user["user_id"]}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@app.delete("/api/routes/{route_id}")
async def delete_route(route_id: str, user: dict = Depends(get_current_user)):
    result = await db.routes.delete_one({"route_id": route_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}


# ─── Personal Records Logic ───
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

        # Calculate time for this distance
        if target_km == distance:
            record_time = duration
        elif splits:
            # Use splits to estimate time for the target distance
            target_km_int = int(target_km)
            matching_splits = [s for s in splits if s.get("km") <= target_km_int]
            if matching_splits:
                record_time = sum(s.get("time", 0) for s in matching_splits)
                # Add remaining fraction
                remaining = target_km - target_km_int
                if remaining > 0 and len(splits) > target_km_int:
                    record_time += splits[target_km_int - 1].get("time", 0) * remaining
            else:
                # Proportional estimate
                record_time = duration * (target_km / distance)
        else:
            # Proportional estimate
            record_time = duration * (target_km / distance)

        record_time = round(record_time, 1)
        record_pace = round((record_time / 60) / target_km, 2)

        # Check existing record
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


# ─── Runs ───
@app.post("/api/runs")
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

@app.get("/api/runs")
async def list_runs(user: dict = Depends(get_current_user)):
    cursor = db.runs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    runs = await cursor.to_list(length=200)
    return runs

@app.get("/api/runs/stats")
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

@app.get("/api/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    run = await db.runs.find_one({"run_id": run_id, "user_id": user["user_id"]}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@app.delete("/api/runs/{run_id}")
async def delete_run(run_id: str, user: dict = Depends(get_current_user)):
    result = await db.runs.delete_one({"run_id": run_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"message": "Run deleted"}


# ─── Profile ───
@app.get("/api/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@app.put("/api/profile")
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


# ─── Personal Records ───
@app.get("/api/records")
async def get_records(user: dict = Depends(get_current_user)):
    cursor = db.personal_records.find({"user_id": user["user_id"]}, {"_id": 0})
    records = await cursor.to_list(length=20)
    # Return all categories, even empty ones
    result = {}
    for label, target_km in RECORD_DISTANCES.items():
        found = next((r for r in records if r.get("category") == label), None)
        if found:
            result[label] = found
        else:
            result[label] = {"category": label, "distance_km": target_km, "time": None, "pace": None}
    return result

@app.get("/api/records/history")
async def get_record_history(user: dict = Depends(get_current_user)):
    """Get all runs that set a personal record, sorted by date"""
    cursor = db.personal_records.find(
        {"user_id": user["user_id"], "time": {"$ne": None}}, {"_id": 0}
    ).sort("achieved_at", -1)
    return await cursor.to_list(length=50)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
