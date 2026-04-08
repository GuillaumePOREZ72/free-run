from typing import Optional, List
from pydantic import BaseModel, EmailStr

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
