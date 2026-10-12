import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.core.config import settings
from app.api.routes import router as api_router
from app.sockets.events import sio
from app.core.firebase import initialize_firebase

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("collabmind")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-time multi-agent collaborative chat platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST routes
app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up CollabMind FastAPI service...")
    initialize_firebase()


@app.get("/")
async def root():
    return {
        "service": "CollabMind Backend",
        "status": "online",
        "docs": "/docs",
        "socket_endpoint": "/socket.io"
    }


# Mount Socket.IO as an ASGI app wrapping FastAPI
socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)
