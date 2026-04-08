import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
db = mongo_client[settings.DB_NAME]
