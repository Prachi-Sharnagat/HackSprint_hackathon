import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "../services/socket";
import { ChatUser, ChatMessage, ChatReply, ConnectionStatus } from "../types/chat";

export interface TypingUser {
  sessionId: string;
  name: string;
}

export function useChatSocket(currentUser: ChatUser | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [serverError, setServerError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);

  const socketRef = useRef(getSocket());
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const socket = socketRef.current;

    // Track initial socket state
    if (socket.connected) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("connecting");
    }

    const onConnect = () => {
      console.log("[Socket] Connected to server, id:", socket.id);
      setConnectionStatus("connected");

      // Auto rejoin if user state is already present (e.g. after socket reconnect)
      if (currentUser) {
        socket.emit("join_chat", {
          sessionId: currentUser.sessionId,
          name: currentUser.name,
          email: currentUser.email,
        });
      }
    };

    const onDisconnect = (reason: string) => {
      console.log("[Socket] Disconnected:", reason);
      setConnectionStatus("disconnected");
      setTypingUsers([]);
    };

    const onConnectError = (error: Error) => {
      console.warn("[Socket] Connection error:", error.message);
      setConnectionStatus("disconnected");
    };

    const onConnectionStatus = (data: { status: ConnectionStatus; message?: string }) => {
      if (data?.status) {
        setConnectionStatus(data.status);
      }
    };

    const onChatHistory = (history: ChatMessage[]) => {
      console.log(`[Socket] Received chat history (${history.length} messages)`);
      setMessages(history);
    };

    const onNewMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const onParticipantsUpdate = (list: ChatUser[]) => {
      console.log("[Socket] Received participants update:", list);
      setParticipants(list);
    };

    const onUserTyping = (data: { sessionId: string; name: string; isTyping: boolean }) => {
      if (!data || !data.sessionId) return;
      if (currentUser && data.sessionId === currentUser.sessionId) return;

      const { sessionId, name, isTyping } = data;

      // Clear existing timer if any
      const existingTimer = typingTimersRef.current.get(sessionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        typingTimersRef.current.delete(sessionId);
      }

      if (isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.sessionId === sessionId)) return prev;
          return [...prev, { sessionId, name }];
        });

        // Set safety cleanup timer (4s)
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.sessionId !== sessionId));
          typingTimersRef.current.delete(sessionId);
        }, 4000);
        typingTimersRef.current.set(sessionId, timer);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.sessionId !== sessionId));
      }
    };

    const onMessageReaction = (data: { messageId: string; reactions: Record<string, string[]> }) => {
      if (!data?.messageId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    };

    const onErrorMessage = (data: { message: string }) => {
      console.error("[Socket] Server error message:", data?.message);
      setServerError(data?.message || "An unknown error occurred.");
      setTimeout(() => {
        setServerError(null);
      }, 5000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("connection_status", onConnectionStatus);
    socket.on("chat_history", onChatHistory);
    socket.on("new_message", onNewMessage);
    socket.on("participants_update", onParticipantsUpdate);
    socket.on("user_typing", onUserTyping);
    socket.on("message_reaction", onMessageReaction);
    socket.on("error_message", onErrorMessage);

    // If socket isn't connected yet, connect now
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("connection_status", onConnectionStatus);
      socket.off("chat_history", onChatHistory);
      socket.off("new_message", onNewMessage);
      socket.off("participants_update", onParticipantsUpdate);
      socket.off("user_typing", onUserTyping);
      socket.off("message_reaction", onMessageReaction);
      socket.off("error_message", onErrorMessage);

      // Clean up typing timers
      for (const timer of typingTimersRef.current.values()) {
        clearTimeout(timer);
      }
      typingTimersRef.current.clear();
    };
  }, [currentUser]);

  const joinChat = useCallback((user: ChatUser) => {
    const socket = socketRef.current;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join_chat", {
      sessionId: user.sessionId,
      name: user.name,
      email: user.email,
    });
  }, []);

  const sendMessage = useCallback((content: string, replyTo?: ChatReply) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const socket = socketRef.current;
    socket.emit("send_message", { content: trimmed, replyTo });
  }, []);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    const socket = socketRef.current;
    socket.emit("message_reaction", { messageId, emoji });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    socket.emit("typing", { isTyping });
  }, []);

  const deleteMessageForMe = useCallback((messageId: string) => {
    setHiddenMessageIds((prev) => [...prev, messageId]);
  }, []);

  const leaveChat = useCallback(() => {
    const socket = socketRef.current;
    socket.emit("leave_chat");
    setMessages([]);
    setParticipants([]);
    setTypingUsers([]);
  }, []);

  const visibleMessages = messages.filter((m) => !hiddenMessageIds.includes(m.id));

  return {
    messages: visibleMessages,
    rawMessages: messages,
    participants,
    connectionStatus,
    serverError,
    typingUsers,
    joinChat,
    sendMessage,
    sendReaction,
    sendTyping,
    deleteMessageForMe,
    leaveChat,
  };
}
