export interface ChatUser {
  sessionId: string;
  name: string;
  email: string;
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

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export type ConversationFilter = "all" | "unread" | "groups" | "online";

export interface ConversationItem {
  id: string; // "general" or participant sessionId
  name: string;
  type: "group" | "direct";
  email?: string;
  isOnline: boolean;
  unreadCount?: number;
}
