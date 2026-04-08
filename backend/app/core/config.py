import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    MONGO_URL = os.environ.get("MONGO_URL")
    DB_NAME = os.environ.get("DB_NAME", "runtracker")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@runtracker.com").lower()
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
    JWT_SECRET = os.environ.get("JWT_SECRET")

settings = Settings()
