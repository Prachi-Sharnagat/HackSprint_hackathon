"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useAuth } from "./useAuth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderType: "user" | "agent" | "system";
  agentTag?: string;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface VisualArtifact {
  type: "mindmap" | "slides" | "markdown";
  title: string;
  content: string; // Mermaid code, JSON string for slides, or markdown
  agentTag?: string;
}

export const useChat = (roomId: string) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<VisualArtifact | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [agentGenerating, setAgentGenerating] = useState<string | null>(null);

  const socketRef = useRef(getSocket(token));

  // Extract visual artifacts from finished messages
  const parseArtifactFromMessage = useCallback((text: string, agentTag?: string) => {
    // Check for mermaid
    const mermaidMatch = text.match(/```mermaid([\s\S]*?)```/);
    if (mermaidMatch) {
      setActiveArtifact({
        type: "mindmap",
        title: "Brainstorm Mind Map",
        content: mermaidMatch[1].trim(),
        agentTag,
      });
      setIsSlideOverOpen(true);
      return;
    }

    // Check for json slides
    const jsonMatch = text.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.slides && Array.isArray(parsed.slides)) {
          setActiveArtifact({
            type: "slides",
            title: parsed.deckTitle || "Presentation Slides",
            content: jsonMatch[1].trim(),
            agentTag,
          });
          setIsSlideOverOpen(true);
          return;
        }
      } catch (e) {
        // Not a slide JSON, ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_room", { roomId });

    // Handle user list & presence
    socket.on("user_joined", (data) => {
      if (data.active_users) setActiveUsers(data.active_users);
    });

    socket.on("user_left", (data) => {
      if (data.active_users) setActiveUsers(data.active_users);
    });

    socket.on("typing_status", (data) => {
      if (data.roomId === roomId) {
        setTypingUsers(data.typingUsers || []);
      }
    });

    // Handle incoming user messages
    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate IDs
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Handle agent streaming lifecycle
    socket.on("agent_start", (data) => {
      setAgentGenerating(data.agentName || data.agentTag);
      const streamingPlaceholder: ChatMessage = {
        id: data.id,
        roomId: data.roomId,
        senderId: `agent-${data.agentTag}`,
        senderName: data.agentName,
        senderType: "agent",
        agentTag: data.agentTag,
        text: "",
        timestamp: data.timestamp,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, streamingPlaceholder]);
    });

    socket.on("agent_stream", (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, text: data.accumulated, isStreaming: true }
            : m
        )
      );
    });

    socket.on("agent_finish", (msg: ChatMessage) => {
      setAgentGenerating(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...msg, isStreaming: false }
            : m
        )
      );
      // Auto-extract and present visual if found
      parseArtifactFromMessage(msg.text, msg.agentTag);
    });

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("typing_status");
      socket.off("new_message");
      socket.off("agent_start");
      socket.off("agent_stream");
      socket.off("agent_finish");
    };
  }, [roomId, token, parseArtifactFromMessage]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !socketRef.current) return;
      socketRef.current.emit("send_message", {
        roomId,
        text,
      });
    },
    [roomId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current) return;
      socketRef.current.emit("typing", {
        roomId,
        isTyping,
      });
    },
    [roomId]
  );

  return {
    messages,
    activeUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    agentGenerating,
    activeArtifact,
    setActiveArtifact,
    isSlideOverOpen,
    setIsSlideOverOpen,
    inspectArtifact: parseArtifactFromMessage,
  };
};
