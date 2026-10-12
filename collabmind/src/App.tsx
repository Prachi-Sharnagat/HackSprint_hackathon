import React, { useState, useEffect } from "react";
import { ChatUser, ChatReply } from "./types/chat";
import { useChatSocket } from "./hooks/useChatSocket";
import { JoinChat } from "./components/JoinChat";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { AlertCircle } from "lucide-react";

export function App() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("collabmind_chat_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  const [activeConversationId, setActiveConversationId] = useState<string>("general");
  // For mobile screen switching: "sidebar" or "chat"
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("chat");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const {
    messages,
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
  } = useChatSocket(currentUser);

  // When user joins
  const handleJoin = (user: ChatUser) => {
    setCurrentUser(user);
    sessionStorage.setItem("collabmind_chat_user", JSON.stringify(user));
    joinChat(user);
  };

  // When user leaves
  const handleLeave = () => {
    leaveChat();
    setCurrentUser(null);
    sessionStorage.removeItem("collabmind_chat_user");
    setUnreadCounts({});
  };

  // Auto-join on reload if currentUser exists
  useEffect(() => {
    if (currentUser) {
      joinChat(currentUser);
    }
  }, []);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileView("chat");
    // Clear unread for selected conversation
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleBackToSidebar = () => {
    setMobileView("sidebar");
  };

  return (
    <div className="h-screen w-screen bg-[#0b141a] text-[#e9edef] overflow-hidden flex flex-col font-sans select-none">
      {/* Server Error Alert Banner */}
      {serverError && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-300 text-xs px-4 py-2 flex items-center justify-center gap-2 z-50">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{serverError}</span>
        </div>
      )}

      {!currentUser ? (
        <JoinChat
          onJoin={handleJoin}
          connectionStatus={connectionStatus}
          initialUser={currentUser}
        />
      ) : (
        <div className="flex-1 flex w-full h-full overflow-hidden relative">
          {/* Desktop & Tablet: both columns visible. Mobile: toggle view */}
          <div
            className={`h-full ${
              mobileView === "sidebar" ? "flex w-full" : "hidden md:flex"
            } md:w-[360px] lg:w-[400px] shrink-0`}
          >
            <Sidebar
              currentUser={currentUser}
              participants={participants}
              lastMessage={lastMessage}
              connectionStatus={connectionStatus}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onLeave={handleLeave}
              typingUsers={typingUsers}
              unreadCounts={unreadCounts}
            />
          </div>

          <div
            className={`flex-1 h-full min-w-0 ${
              mobileView === "chat" ? "flex flex-col" : "hidden md:flex md:flex-col"
            }`}
          >
            <ChatWindow
              currentUser={currentUser}
              messages={messages}
              participants={participants}
              activeConversationId={activeConversationId}
              onSendMessage={sendMessage}
              onSendReaction={sendReaction}
              onTyping={sendTyping}
              onDeleteMessageForMe={deleteMessageForMe}
              onBackToSidebar={handleBackToSidebar}
              typingUsers={typingUsers}
              disabled={connectionStatus !== "connected"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
