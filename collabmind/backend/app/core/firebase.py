import logging
import os
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import auth, credentials
from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None


def initialize_firebase() -> Optional[firebase_admin.App]:
    """Initializes Firebase Admin SDK if not already initialized."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            logger.info(f"Initializing Firebase Admin with key file: {settings.FIREBASE_CREDENTIALS_PATH}")
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            _firebase_app = firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID
            })
        else:
            # Fallback to Google Application Default Credentials (e.g., Cloud Run or local gcloud auth)
            logger.info("Initializing Firebase Admin with default credentials")
            _firebase_app = firebase_admin.initialize_app(options={
                'projectId': settings.FIREBASE_PROJECT_ID
            })
        return _firebase_app
    except Exception as e:
        logger.warning(f"Firebase Admin SDK initialization warning: {e}. Running in mock/development mode.")
        return None


def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Firebase ID token.
    Returns decoded token dictionary if valid, or None if invalid.
    """
    if not token:
        return None

    try:
        # Check if Firebase is initialized
        initialize_firebase()
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        # In local development mock mode if token is 'mock-token', allow bypass
        if settings.ENVIRONMENT == "development" and token.startswith("dev-token-"):
            uid = token.replace("dev-token-", "")
            return {"uid": uid, "email": f"{uid}@example.com", "name": f"User {uid}"}
        return None
