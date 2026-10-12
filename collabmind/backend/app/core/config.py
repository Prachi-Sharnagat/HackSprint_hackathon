import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "CollabMind Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8080

    # CORS origins for Next.js frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Firebase Admin SDK Configuration
    FIREBASE_PROJECT_ID: str = "collabmind-app"
    FIREBASE_CREDENTIALS_PATH: str = ""  # Path to serviceAccountKey.json if running locally

    # Google Cloud / Vertex AI Settings
    GCP_PROJECT_ID: str = "collabmind-app"
    VERTEX_AI_LOCATION: str = "us-central1"
    GEMINI_MODEL: str = "gemini-1.5-flash-001"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
