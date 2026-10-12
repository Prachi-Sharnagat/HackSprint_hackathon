import asyncio
import logging
import time
import uuid
import socketio
from typing import Dict, Any
from app.core.config import settings
from app.core.firebase import verify_firebase_token
from app.sockets.room_mgr import room_manager
from app.agents.router import agent_router
from app.agents.executor import agent_executor

logger = logging.getLogger(__name__)

# Create Socket.IO async server with CORS origins
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS or "*",
    logger=False,
    engineio_logger=False
)


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Dict[str, Any] = None):
    logger.info(f"Socket connection attempt: sid={sid}")
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")

    # In development mode, generate mock user profile if no valid token provided
    user_info = None
    if token:
        user_info = verify_firebase_token(token)

    if not user_info:
        user_info = {
            "uid": f"guest-{sid[:6]}",
            "name": f"Guest {sid[:4]}",
            "email": f"guest-{sid[:6]}@collabmind.local",
            "avatar": f"https://api.dicebear.com/7.x/bottts/svg?seed={sid[:6]}"
        }

    room_manager.register_user(sid, user_info)
    await sio.emit("connected", {"sid": sid, "user": user_info}, room=sid)


@sio.event
async def disconnect(sid: str):
    logger.info(f"Socket disconnected: sid={sid}")
    left_room = room_manager.unregister_user(sid)
    if left_room:
        await sio.leave_room(sid, left_room)
        # Notify room of user leaving
        await sio.emit(
            "user_left",
            {"sid": sid, "active_users": room_manager.get_room_users(left_room)},
            room=left_room
        )


@sio.event
async def join_room(sid: str, data: Dict[str, Any]):
    room_id = data.get("roomId")
    if not room_id:
        return {"status": "error", "message": "roomId is required"}

    await sio.enter_room(sid, room_id)
    room_manager.join_room(sid, room_id)

    user = room_manager.sid_to_user.get(sid, {})
    active_users = room_manager.get_room_users(room_id)

    # Notify others in the room
    await sio.emit(
        "user_joined",
        {"user": user, "active_users": active_users, "roomId": room_id},
        room=room_id
    )

    return {"status": "ok", "active_users": active_users}


@sio.event
async def leave_room(sid: str, data: Dict[str, Any]):
    room_id = data.get("roomId") or room_manager.sid_to_room.get(sid)
    if room_id:
        await sio.leave_room(sid, room_id)
        room_manager.leave_room(sid)
        await sio.emit(
            "user_left",
            {"sid": sid, "active_users": room_manager.get_room_users(room_id), "roomId": room_id},
            room=room_id
        )
    return {"status": "ok"}


@sio.event
async def typing(sid: str, data: Dict[str, Any]):
    room_id = data.get("roomId")
    is_typing = data.get("isTyping", False)
    user = room_manager.sid_to_user.get(sid, {})
    uid = user.get("uid", sid)
    name = user.get("name", "Someone")

    if room_id:
        typing_map = room_manager.set_typing(room_id, uid, name, is_typing)
        await sio.emit(
            "typing_status",
            {"typingUsers": list(typing_map.values()), "roomId": room_id},
            room=room_id,
            skip_sid=sid
        )


@sio.event
async def send_message(sid: str, data: Dict[str, Any]):
    room_id = data.get("roomId")
    text = data.get("text", "").strip()
    if not room_id or not text:
        return {"status": "error", "message": "roomId and text required"}

    user = room_manager.sid_to_user.get(sid, {
        "uid": "unknown",
        "name": "Anonymous",
        "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=unknown"
    })

    message_id = str(uuid.uuid4())
    message_payload = {
        "id": message_id,
        "roomId": room_id,
        "senderId": user.get("uid"),
        "senderName": user.get("name"),
        "senderAvatar": user.get("avatar"),
        "senderType": "user",
        "text": text,
        "timestamp": int(time.time() * 1000)
    }

    # Broadcast user's message immediately
    await sio.emit("new_message", message_payload, room=room_id)

    # Check for agent mentions
    agent_tag, clean_prompt = agent_router.parse_command(text)
    if agent_tag:
        # Spawn asynchronous background task for AI generation so chat doesn't block
        asyncio.create_task(
            handle_agent_response(room_id, agent_tag, clean_prompt or text)
        )

    return {"status": "ok", "messageId": message_id}


async def handle_agent_response(room_id: str, agent_tag: str, prompt: str):
    """
    Executes agent stream and broadcasts progress and final content to the room.
    """
    agent_msg_id = str(uuid.uuid4())
    agent_name = agent_tag.replace("@", "").title() + " Agent"

    # Notify room that agent has started generating
    await sio.emit(
        "agent_start",
        {
            "id": agent_msg_id,
            "roomId": room_id,
            "agentTag": agent_tag,
            "agentName": agent_name,
            "timestamp": int(time.time() * 1000)
        },
        room=room_id
    )

    full_response = ""
    try:
        async for chunk in agent_executor.execute_stream(agent_tag, prompt):
            full_response += chunk
            await sio.emit(
                "agent_stream",
                {
                    "id": agent_msg_id,
                    "roomId": room_id,
                    "agentTag": agent_tag,
                    "chunk": chunk,
                    "accumulated": full_response
                },
                room=room_id
            )
            # Minimal yield
            await asyncio.sleep(0.01)

        # Finalize agent message
        await sio.emit(
            "agent_finish",
            {
                "id": agent_msg_id,
                "roomId": room_id,
                "senderId": f"agent-{agent_tag}",
                "senderName": agent_name,
                "senderType": "agent",
                "agentTag": agent_tag,
                "text": full_response,
                "timestamp": int(time.time() * 1000)
            },
            room=room_id
        )

    except Exception as e:
        logger.error(f"Error streaming agent response: {e}")
        await sio.emit(
            "agent_error",
            {"id": agent_msg_id, "roomId": room_id, "error": str(e)},
            room=room_id
        )
