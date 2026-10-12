import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Users,
  Video,
  Phone,
  Search,
  MoreVertical,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Shield,
  MessageSquare,
  Trash2,
  Download,
  Info,
} from "lucide-react";
import { ChatUser, ChatMessage, ChatReply } from "../types/chat";
import { TypingUser } from "../hooks/useChatSocket";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

interface ChatWindowProps {
  currentUser: ChatUser;
  messages: ChatMessage[];
  participants: ChatUser[];
  activeConversationId: string;
  onSendMessage: (content: string, replyTo?: ChatReply) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDeleteMessageForMe: (messageId: string) => void;
  onBackToSidebar?: () => void;
  typingUsers: TypingUser[];
  disabled?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  messages,
  participants,
  activeConversationId,
  onSendMessage,
  onSendReaction,
  onTyping,
  onDeleteMessageForMe,
  onBackToSidebar,
  typingUsers,
  disabled,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [customMeetUrl, setCustomMeetUrl] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatReply | null>(null);

  // Auto-scroll to latest message if at bottom or when a new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Search matches
  const matchingMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return messages
      .filter((m) => m.content.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQuery]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const handleNextMatch = () => {
    if (matchingMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchingMessageIds.length);
  };

  const handlePrevMatch = () => {
    if (matchingMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchingMessageIds.length) % matchingMessageIds.length);
  };

  // Google Meet actions
  const handleLaunchInstantMeet = () => {
    window.open("https://meet.google.com/new", "_blank");
    onSendMessage(`🎥 Google Meet video call started by ${currentUser.name}! Join at: https://meet.google.com/new`);
    setShowMeetModal(false);
  };

  const handleShareCustomMeet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMeetUrl.trim()) return;
    let url = customMeetUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    onSendMessage(`🎥 Google Meet link shared by ${currentUser.name}: ${url}`);
    setCustomMeetUrl("");
    setShowMeetModal(false);
  };

  // Export Chat
  const handleExportChat = () => {
    setShowMenu(false);
    const content = messages
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleString()}] ${m.senderName}: ${m.content}`
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collabmind-chat-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Typing status text
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    return `${typingUsers.length} people are typing...`;
  }, [typingUsers]);

  // Active conversation details
  const isGroup = activeConversationId === "general";
  const targetUser = !isGroup
    ? participants.find((p) => p.sessionId === activeConversationId)
    : null;
  const conversationTitle = isGroup
    ? "General Chat"
    : targetUser
    ? targetUser.name
    : "Direct Chat";

  // Date separator formatting
  const getDateLabel = (timestamp: number) => {
    const msgDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      msgDate.getDate() === today.getDate() &&
      msgDate.getMonth() === today.getMonth() &&
      msgDate.getFullYear() === today.getFullYear()
    ) {
      return "TODAY";
    }
    if (
      msgDate.getDate() === yesterday.getDate() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getFullYear() === yesterday.getFullYear()
    ) {
      return "YESTERDAY";
    }
    return msgDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    }).toUpperCase();
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden select-none">
      {/* 1. Compact Conversation Header */}
      <header className="h-[64px] px-4 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-[#e9edef] rounded-full transition"
              title="Back to chats"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Conversation Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {isGroup ? <Users className="w-5 h-5" /> : conversationTitle.slice(0, 2).toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#202c33] ${
                disabled ? "bg-rose-500" : "bg-[#25d366]"
              }`}
            />
          </div>

          {/* Title & Dynamic Status */}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#e9edef] truncate tracking-tight">
              {conversationTitle}
            </h2>
            <div className="text-[11px] truncate flex items-center gap-1.5">
              {typingText ? (
                <span className="text-[#25d366] font-medium animate-pulse">
                  {typingText}
                </span>
              ) : disabled ? (
                <span className="text-rose-400">Offline</span>
              ) : isGroup ? (
                <span className="text-[#8696a0]">
                  {participants.length} participant{participants.length === 1 ? "" : "s"}
                  {participants.length > 0 &&
                    ` (${participants.map((p) => (p.sessionId === currentUser.sessionId ? "You" : p.name)).join(", ")})`}
                </span>
              ) : (
                <span className="text-[#25d366]">online</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Action Buttons */}
        <div className="flex items-center gap-1 text-[#8696a0]">
          {/* Search in conversation */}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className={`p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition ${
              showSearch ? "text-[#00a884] bg-[#111b21]" : ""
            }`}
            title="Search in chat"
            aria-label="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Voice Call (Unavailable indicator) */}
          <button
            className="p-2 rounded-full hover:bg-[#111b21] text-[#8696a0]/50 hover:text-[#8696a0] transition cursor-not-allowed"
            title="Voice call (Coming soon)"
            aria-label="Voice call unavailable"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Google Meet Video Call */}
          <button
            onClick={() => setShowMeetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition ml-1 shadow-sm"
            title="Start or Share Google Meet"
          >
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Google Meet</span>
          </button>

          {/* Conversation Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-10 w-48 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 z-40 text-xs text-[#e9edef] animate-fade-in">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowInfoModal(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#111b21] flex items-center gap-2 transition"
                  >
                    <Info className="w-4 h-4 text-[#8696a0]" />
                    <span>Chat Info</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowSearch(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#111b21] flex items-center gap-2 transition"
                  >
                    <Search className="w-4 h-4 text-[#8696a0]" />
                    <span>Search Messages</span>
                  </button>

                  <button
                    onClick={handleExportChat}
                    className="w-full text-left px-4 py-2 hover:bg-[#111b21] flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-[#8696a0]" />
                    <span>Export Chat (.txt)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. In-Chat Search Bar */}
      {showSearch && (
        <div className="bg-[#111b21] border-b border-[#2a3942] px-4 py-2 flex items-center gap-3 z-10 animate-fade-in shadow-sm">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-[#8696a0] absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Search in loaded messages..."
              className="w-full bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="flex items-center gap-2 text-xs text-[#8696a0] shrink-0">
              <span>
                {matchingMessageIds.length > 0
                  ? `${currentMatchIndex + 1} of ${matchingMessageIds.length}`
                  : "No matches"}
              </span>
              <button
                onClick={handlePrevMatch}
                disabled={matchingMessageIds.length === 0}
                className="p-1 hover:text-[#e9edef] disabled:opacity-30 rounded"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMatch}
                disabled={matchingMessageIds.length === 0}
                className="p-1 hover:text-[#e9edef] disabled:opacity-30 rounded"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] rounded-full transition"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Google Meet Quick Action Modal */}
      {showMeetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3942]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#e9edef]">Google Meet Video Call</h3>
                  <p className="text-[11px] text-[#8696a0]">Instant video conference for all room participants</p>
                </div>
              </div>
              <button
                onClick={() => setShowMeetModal(false)}
                className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Launch Instant Meeting */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#2a3942] space-y-2">
              <span className="text-xs font-semibold text-[#e9edef]">
                Launch Instant Meeting
              </span>
              <p className="text-[11px] text-[#8696a0]">
                Opens <code>meet.google.com/new</code> in a new tab and broadcasts the link to everyone in the room.
              </p>
              <button
                type="button"
                onClick={handleLaunchInstantMeet}
                className="w-full mt-1 flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold py-2.5 rounded-xl text-xs transition shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch Google Meet (meet.google.com/new)</span>
              </button>
            </div>

            {/* Share Custom Link */}
            <form onSubmit={handleShareCustomMeet} className="space-y-2">
              <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider">
                Or Share Existing Meeting URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={customMeetUrl}
                  onChange={(e) => setCustomMeetUrl(e.target.value)}
                  className="flex-1 bg-[#0b141a] border border-[#2a3942] focus:border-[#00a884] rounded-xl px-3 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] outline-none"
                />
                <button
                  type="submit"
                  disabled={!customMeetUrl.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition"
                >
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Chat Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#2a3942] rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]">
              <h3 className="text-sm font-bold text-[#e9edef]">Chat Details</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-[#8696a0]">
              <div className="flex justify-between py-1 border-b border-[#2a3942]/50">
                <span>Room Name:</span>
                <span className="font-semibold text-[#e9edef]">General Chat</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2a3942]/50">
                <span>Active Participants:</span>
                <span className="font-semibold text-emerald-400">{participants.length} connected</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2a3942]/50">
                <span>Total Messages:</span>
                <span className="font-semibold text-[#e9edef]">{messages.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2a3942]/50">
                <span>Backend Port:</span>
                <span className="font-mono text-emerald-400">3001 (In-Memory)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Frontends Synced:</span>
                <span className="font-mono text-[#e9edef]">5173, 5174, 5175</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Message Canvas */}
      <div
        ref={containerRef}
        className="wa-wallpaper flex-1 overflow-y-auto px-4 py-3 relative z-10 select-text"
      >
        <div className="max-w-4xl mx-auto w-full">
          {/* Welcome State (ONLY when no messages exist) */}
          {messages.length === 0 && (
            <div className="my-16 mx-auto max-w-sm p-6 bg-[#182229]/90 border border-[#2a3942] rounded-2xl text-center backdrop-blur-sm shadow-xl select-none">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#8b7cff]/20 to-[#00a884]/20 border border-emerald-500/30 flex items-center justify-center text-[#25d366] mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#e9edef]">
                Welcome to CollabMind
              </h3>
              <p className="text-xs text-[#8696a0] mt-1.5 leading-relaxed">
                Real-time multi-port messaging is ready. Send a message to start chatting or launch a Google Meet video session!
              </p>
            </div>
          )}

          {/* Messages Feed with Date Separators and Grouping */}
          {messages.map((msg, index) => {
            const isSelf = msg.senderSessionId === currentUser.sessionId;

            // Date separator check
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateSeparator =
              !prevMsg ||
              new Date(prevMsg.timestamp).toDateString() !==
                new Date(msg.timestamp).toDateString();
            const dateLabel = showDateSeparator ? getDateLabel(msg.timestamp) : null;

            // Grouping logic (same sender within 2 minutes)
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const isFirstInGroup =
              !prevMsg ||
              prevMsg.senderSessionId !== msg.senderSessionId ||
              msg.timestamp - prevMsg.timestamp > 120000;
            const isLastInGroup =
              !nextMsg ||
              nextMsg.senderSessionId !== msg.senderSessionId ||
              nextMsg.timestamp - msg.timestamp > 120000;

            return (
              <React.Fragment key={msg.id}>
                {/* Date separator pill */}
                {showDateSeparator && (
                  <div className="flex justify-center my-4 select-none">
                    <span className="bg-[#182229] border border-[#2a3942] text-[#8696a0] text-[11px] font-medium py-1 px-3 rounded-lg shadow-sm">
                      {dateLabel}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <MessageBubble
                  message={msg}
                  isSelf={isSelf}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  searchQuery={searchQuery}
                  onReply={(target) => setReplyTarget(target)}
                  onReact={onSendReaction}
                  onDeleteForMe={onDeleteMessageForMe}
                />
              </React.Fragment>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 6. Message Composer */}
      <div className="relative z-20">
        <MessageComposer
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          disabled={disabled}
        />
      </div>
    </main>
  );
};
