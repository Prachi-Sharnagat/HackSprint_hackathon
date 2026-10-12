import http from "http";
import express from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";

export interface ChatUser {
  sessionId: string;
  name: string;
  email: string;
  socketId: string;
  joinedAt: number;
}

export interface ChatReply {
  id: string;
  senderName: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  senderSessionId: string;
  senderName: string;
  content: string;
  timestamp: number;
  replyTo?: ChatReply;
  reactions?: Record<string, string[]>;
}

const PORT = 3001;
const MAX_MESSAGES = 200;
const MAX_CONTENT_LENGTH = 2000;
const ROOM_NAME = "general";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local dev testing
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "CollabMind Socket.IO Backend",
    port: PORT,
    activeParticipants: participants.size,
    messageCount: messageHistory.length,
    timestamp: Date.now(),
  });
});

app.get("/", (_req, res) => {
  res.send("CollabMind Real-Time Chat Server is running on port " + PORT);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// In-Memory Storage
// Map of socketId -> ChatUser
const socketToUser = new Map<string, ChatUser>();
// Map of sessionId -> ChatUser (ensures 1 active user entry per sessionId)
const participants = new Map<string, ChatUser>();
// Message history array, capped at MAX_MESSAGES
const messageHistory: ChatMessage[] = [];

function getPublicParticipantList(): Array<{ sessionId: string; name: string; email: string }> {
  const list: Array<{ sessionId: string; name: string; email: string }> = [];
  for (const user of participants.values()) {
    list.push({
      sessionId: user.sessionId,
      name: user.name,
      email: user.email,
    });
  }
  return list;
}

function broadcastParticipants() {
  const list = getPublicParticipantList();
  io.to(ROOM_NAME).emit("participants_update", list);
  console.log(`[Participants] Broadcasted active participants count: ${list.length}`);
}

io.on("connection", (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id} from origin: ${socket.handshake.headers.origin || "unknown"}`);

  // Send initial connection status
  socket.emit("connection_status", {
    status: "connected",
    message: "Connected to CollabMind server",
  });

  // Client requests to join chat
  socket.on("join_chat", (payload: { sessionId?: string; name?: string; email?: string }) => {
    try {
      const sessionId = payload?.sessionId?.trim();
      const name = payload?.name?.trim();
      const email = payload?.email?.trim();

      if (!sessionId || !name || !email) {
        socket.emit("error_message", { message: "Invalid join request: Name, Email and Session ID are required." });
        return;
      }

      // Email format sanity check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        socket.emit("error_message", { message: "Invalid email format." });
        return;
      }

      // Check if session previously existed with another socket (reconnection / tab switch)
      const existingUser = participants.get(sessionId);
      if (existingUser) {
        // Remove stale socket mapping if changed
        if (existingUser.socketId !== socket.id) {
          socketToUser.delete(existingUser.socketId);
        }
      }

      const chatUser: ChatUser = {
        sessionId,
        name: name.slice(0, 50),
        email: email.slice(0, 100),
        socketId: socket.id,
        joinedAt: Date.now(),
      };

      // Register session and socket
      participants.set(sessionId, chatUser);
      socketToUser.set(socket.id, chatUser);

      // Join general room
      socket.join(ROOM_NAME);
      console.log(`[Join] User '${chatUser.name}' (${chatUser.email}) joined general room. Socket: ${socket.id}`);

      // Send existing message history to the newly joined participant
      socket.emit("chat_history", messageHistory);

      // Broadcast updated participant list to everyone in general room
      broadcastParticipants();
    } catch (err: any) {
      console.error("[Error in join_chat]:", err);
      socket.emit("error_message", { message: "Internal server error joining chat." });
    }
  });

  // Client sends a new chat message
  socket.on("send_message", (payload: { content?: string; replyTo?: ChatReply }) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user) {
        socket.emit("error_message", { message: "You must join the chat before sending messages." });
        return;
      }

      const content = payload?.content?.trim();
      if (!content) {
        socket.emit("error_message", { message: "Message content cannot be empty." });
        return;
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        socket.emit("error_message", {
          message: `Message exceeds maximum allowed length of ${MAX_CONTENT_LENGTH} characters.`,
        });
        return;
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const chatMessage: ChatMessage = {
        id: messageId,
        senderSessionId: user.sessionId,
        senderName: user.name,
        content,
        timestamp: Date.now(),
        ...(payload?.replyTo ? { replyTo: payload.replyTo } : {}),
        reactions: {},
      };

      // Store in memory
      messageHistory.push(chatMessage);
      if (messageHistory.length > MAX_MESSAGES) {
        messageHistory.shift();
      }

      // Broadcast to every client in the general room (including sender)
      io.to(ROOM_NAME).emit("new_message", chatMessage);
      // Clear user typing status when a message is sent
      socket.to(ROOM_NAME).emit("user_typing", { sessionId: user.sessionId, name: user.name, isTyping: false });
      console.log(`[Message] From '${user.name}' (${user.sessionId.slice(0, 8)}): "${content.slice(0, 40)}"`);
    } catch (err: any) {
      console.error("[Error in send_message]:", err);
      socket.emit("error_message", { message: "Internal server error sending message." });
    }
  });

  // Client typing state update
  socket.on("typing", (payload: { isTyping?: boolean }) => {
    const user = socketToUser.get(socket.id);
    if (user) {
      socket.to(ROOM_NAME).emit("user_typing", {
        sessionId: user.sessionId,
        name: user.name,
        isTyping: !!payload?.isTyping,
      });
    }
  });

  // Client message reaction toggle
  socket.on("message_reaction", (payload: { messageId?: string; emoji?: string }) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user || !payload?.messageId || !payload?.emoji) return;

      const targetMsg = messageHistory.find((m) => m.id === payload.messageId);
      if (!targetMsg) return;

      if (!targetMsg.reactions) {
        targetMsg.reactions = {};
      }

      const emoji = payload.emoji;
      const currentList = targetMsg.reactions[emoji] || [];
      const alreadyReacted = currentList.includes(user.name);

      if (alreadyReacted) {
        targetMsg.reactions[emoji] = currentList.filter((n) => n !== user.name);
        if (targetMsg.reactions[emoji].length === 0) {
          delete targetMsg.reactions[emoji];
        }
      } else {
        targetMsg.reactions[emoji] = [...currentList, user.name];
      }

      io.to(ROOM_NAME).emit("message_reaction", {
        messageId: targetMsg.id,
        reactions: targetMsg.reactions,
      });
    } catch (err) {
      console.error("[Error in message_reaction]:", err);
    }
  });

  // Client explicitly leaves chat
  socket.on("leave_chat", () => {
    const user = socketToUser.get(socket.id);
    if (user) {
      console.log(`[Leave] User '${user.name}' left chat explicitly.`);
      socket.to(ROOM_NAME).emit("user_typing", { sessionId: user.sessionId, name: user.name, isTyping: false });
      participants.delete(user.sessionId);
      socketToUser.delete(socket.id);
      socket.leave(ROOM_NAME);
      broadcastParticipants();
    }
  });

  // Disconnection handler
  socket.on("disconnect", (reason) => {
    console.log(`[Socket Disconnected] ID: ${socket.id}, reason: ${reason}`);
    const user = socketToUser.get(socket.id);
    if (user) {
      socket.to(ROOM_NAME).emit("user_typing", { sessionId: user.sessionId, name: user.name, isTyping: false });
      // Only delete from participants if this was the active socket for this session
      const currentSessionUser = participants.get(user.sessionId);
      if (currentSessionUser && currentSessionUser.socketId === socket.id) {
        participants.delete(user.sessionId);
      }
      socketToUser.delete(socket.id);
      broadcastParticipants();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`=======================================================`);
  console.log(`🚀 CollabMind Socket.IO Chat Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`Allowed Origins: ${allowedOrigins.join(", ")}`);
  console.log(`=======================================================`);
});
