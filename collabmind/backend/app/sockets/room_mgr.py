from typing import Dict, Set, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class RoomManager:
    """
    Manages active chat rooms, connected users, and socket memberships.
    """

    def __init__(self):
        # Maps roomId -> set of sid
        self.rooms: Dict[str, Set[str]] = {}
        # Maps sid -> user data dict {"uid": ..., "name": ..., "email": ..., "avatar": ...}
        self.sid_to_user: Dict[str, Dict[str, Any]] = {}
        # Maps sid -> current roomId
        self.sid_to_room: Dict[str, str] = {}
        # Maps roomId -> dict of typing users: {uid: userName}
        self.typing_users: Dict[str, Dict[str, str]] = {}

    def register_user(self, sid: str, user_data: Dict[str, Any]) -> None:
        self.sid_to_user[sid] = user_data
        logger.info(f"Registered socket {sid} for user {user_data.get('email', 'anonymous')}")

    def unregister_user(self, sid: str) -> Optional[str]:
        room_id = self.sid_to_room.pop(sid, None)
        user_data = self.sid_to_user.pop(sid, None)

        if room_id and room_id in self.rooms:
            self.rooms[room_id].discard(sid)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

            if user_data and room_id in self.typing_users:
                self.typing_users[room_id].pop(user_data.get("uid", ""), None)

        return room_id

    def join_room(self, sid: str, room_id: str) -> None:
        # If user was in another room, leave it
        old_room = self.sid_to_room.get(sid)
        if old_room and old_room in self.rooms:
            self.rooms[old_room].discard(sid)

        self.sid_to_room[sid] = room_id
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(sid)
        logger.info(f"Socket {sid} joined room {room_id}")

    def leave_room(self, sid: str) -> Optional[str]:
        room_id = self.sid_to_room.pop(sid, None)
        if room_id and room_id in self.rooms:
            self.rooms[room_id].discard(sid)
        return room_id

    def get_room_users(self, room_id: str) -> List[Dict[str, Any]]:
        sids = self.rooms.get(room_id, set())
        users = []
        seen_uids = set()

        for sid in sids:
            u = self.sid_to_user.get(sid)
            if u:
                uid = u.get("uid")
                if uid and uid not in seen_uids:
                    seen_uids.add(uid)
                    users.append(u)
        return users

    def set_typing(self, room_id: str, uid: str, user_name: str, is_typing: bool) -> Dict[str, str]:
        if room_id not in self.typing_users:
            self.typing_users[room_id] = {}

        if is_typing:
            self.typing_users[room_id][uid] = user_name
        else:
            self.typing_users[room_id].pop(uid, None)

        return self.typing_users[room_id]


room_manager = RoomManager()
