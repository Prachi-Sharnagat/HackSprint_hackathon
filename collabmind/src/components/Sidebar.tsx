import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Users,
  LogOut,
  X,
  MoreVertical,
  MessageSquarePlus,
  Wifi,
  Radio,
  WifiOff,
  User as UserIcon,
  Check,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { ChatUser, ChatMessage, ConnectionStatus, ConversationFilter } from "../types/chat";
import { TypingUser } from "../hooks/useChatSocket";

interface SidebarProps {
  currentUser: ChatUser;
  participants: ChatUser[];
  lastMessage?: ChatMessage | null;
  connectionStatus: ConnectionStatus;
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onLeave: () => void;
  typingUsers: TypingUser[];
  unreadCounts?: Record<string, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  participants,
  lastMessage,
  connectionStatus,
  activeConversationId,
  onSelectConversation,
  onLeave,
  typingUsers,
  unreadCounts = {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const currentPort = typeof window !== "undefined" ? window.location.port || "5173" : "5173";

  // Typing indicator text for General Chat
  const isSomeoneTyping = typingUsers.length > 0;
  const typingText = isSomeoneTyping
    ? typingUsers.length === 1
      ? `${typingUsers[0].name} is typing...`
      : `${typingUsers.length} people typing...`
    : null;

  // Conversations builder
  const allConversations = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: "group" | "direct";
      subtitle: string;
      isOnline: boolean;
      participantCount: number;
      unreadCount: number;
    }> = [
      {
        id: "general",
        name: "General Chat",
        type: "group",
        subtitle: "CollabMind main room",
        isOnline: connectionStatus === "connected",
        participantCount: participants.length,
        unreadCount: unreadCounts["general"] || 0,
      },
    ];

    // Other online participants as direct items
    participants.forEach((p) => {
      if (p.sessionId !== currentUser.sessionId) {
        list.push({
          id: p.sessionId,
          name: p.name,
          type: "direct" as const,
          subtitle: p.email,
          isOnline: true,
          participantCount: 1,
          unreadCount: unreadCounts[p.sessionId] || 0,
        });
      }
    });

    return list;
  }, [participants, currentUser.sessionId, connectionStatus, unreadCounts]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return allConversations.filter((conv) => {
      // Search query matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = conv.name.toLowerCase().includes(query);
        const matchesSubtitle = conv.subtitle?.toLowerCase().includes(query);
        const matchesLastMsg =
          conv.id === "general" &&
          lastMessage?.content?.toLowerCase().includes(query);
        if (!matchesName && !matchesSubtitle && !matchesLastMsg) {
          return false;
        }
      }

      // Filter tabs
      if (activeFilter === "unread") {
        return (conv.unreadCount || 0) > 0;
      }
      if (activeFilter === "groups") {
        return conv.type === "group";
      }
      if (activeFilter === "online") {
        return conv.isOnline;
      }
      return true;
    });
  }, [allConversations, searchQuery, activeFilter, lastMessage]);

  const getConnectionConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: Wifi,
          label: "Connected",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          dotColor: "bg-[#25d366]",
        };
      case "connecting":
        return {
          icon: Radio,
          label: "Connecting...",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          dotColor: "bg-amber-400 animate-pulse",
        };
      case "disconnected":
        return {
          icon: WifiOff,
          label: "Disconnected",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          dotColor: "bg-rose-400",
        };
    }
  };

  const statusConfig = getConnectionConfig();

  // Helper avatar generator colors
  const getAvatarGradient = (id: string) => {
    if (id === "general") {
      return "from-emerald-600 to-teal-500";
    }
    const colors = [
      "from-violet-600 to-indigo-500",
      "from-blue-600 to-cyan-500",
      "from-amber-600 to-orange-500",
      "from-rose-600 to-pink-500",
      "from-teal-600 to-emerald-500",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <aside className="w-full md:w-[360px] lg:w-[400px] h-full flex flex-col bg-[#111b21] border-r border-[#2a3942] select-none shrink-0 relative">
      {/* 1. Sidebar Top Header */}
      <div className="h-[64px] px-4 bg-[#202c33] flex items-center justify-between border-b border-[#2a3942] z-20">
        {/* CollabMind Brand & User Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" title={`${currentUser.name} (${currentUser.email})`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8b7cff] to-[#00a884] p-[1.5px] shadow-sm">
              <div className="w-full h-full rounded-full bg-[#111b21] flex items-center justify-center text-[#e9edef] font-semibold text-xs">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#202c33] ${
                connectionStatus === "connected" ? "bg-[#25d366]" : "bg-rose-400"
              }`}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#e9edef] tracking-tight">CollabMind</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#8b7cff]/15 text-[#8b7cff] border border-[#8b7cff]/30 font-medium">
                Web
              </span>
            </div>
            <span className="text-[10px] text-[#8696a0] font-mono">Port :{currentPort}</span>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 text-[#8696a0]">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition"
            title="New Chat"
            aria-label="New chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition"
              title="Menu"
              aria-label="Sidebar Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
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
                      setShowNewChatModal(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#111b21] flex items-center gap-2 transition"
                  >
                    <Users className="w-4 h-4 text-[#8696a0]" />
                    <span>New Group Chat</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSelectConversation("general");
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#111b21] flex items-center gap-2 transition"
                  >
                    <MessageSquare className="w-4 h-4 text-[#8696a0]" />
                    <span>General Chat Room</span>
                  </button>
                  <div className="h-[1px] bg-[#2a3942] my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLeave();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave & Switch Account</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="p-2.5 bg-[#111b21] border-b border-[#2a3942]">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-[#8696a0] hover:text-[#e9edef] transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. Conversation Filters */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "groups", label: "Groups" },
              { id: "online", label: "Online" },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition whitespace-nowrap ${
                  isActive
                    ? "bg-[#00a884] text-[#111b21] font-semibold"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a3942]/30">
        {filteredConversations.map((conv) => {
          const isSelected = activeConversationId === conv.id;
          const isGroup = conv.type === "group";
          const gradientClass = getAvatarGradient(conv.id);

          return (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition select-none group ${
                isSelected
                  ? "bg-[#2a3942]"
                  : "hover:bg-[#202c33]/70"
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}
                >
                  {isGroup ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    conv.name.slice(0, 2).toUpperCase() || <UserIcon className="w-5 h-5" />
                  )}
                </div>
                {/* Online indicator dot */}
                {conv.isOnline && (
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#111b21]"
                    title="Online"
                  />
                )}
              </div>

              {/* Text content & snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e9edef] truncate">
                    {conv.name}
                  </span>
                  <span className="text-[11px] text-[#8696a0] shrink-0 font-normal">
                    {isGroup
                      ? formatTimestamp(lastMessage?.timestamp)
                      : "online"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  {/* Last message preview or Typing indicator */}
                  <div className="text-xs text-[#8696a0] truncate pr-2">
                    {isGroup ? (
                      typingText ? (
                        <span className="text-[#25d366] font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
                          {typingText}
                        </span>
                      ) : lastMessage ? (
                        <span className="flex items-center gap-1 truncate">
                          {lastMessage.senderSessionId === currentUser.sessionId && (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                          )}
                          <span className="font-medium text-[#d1d7db]">
                            {lastMessage.senderSessionId === currentUser.sessionId
                              ? "You: "
                              : `${lastMessage.senderName}: `}
                          </span>
                          <span className="truncate">{lastMessage.content}</span>
                        </span>
                      ) : (
                        <span className="italic text-[#8696a0]">No messages yet</span>
                      )
                    ) : (
                      <span className="truncate text-[#8696a0]">{conv.subtitle}</span>
                    )}
                  </div>

                  {/* Unread badge */}
                  {(conv.unreadCount || 0) > 0 && (
                    <span className="bg-[#00a884] text-[#111b21] font-bold text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredConversations.length === 0 && (
          <div className="p-8 text-center text-xs text-[#8696a0]">
            No conversations match "{searchQuery}"
          </div>
        )}
      </div>

      {/* 5. Bottom Current User Profile & Live Connection Status */}
      <div className="p-3 bg-[#202c33] border-t border-[#2a3942] z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-[#25d366] font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#e9edef] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#111b21] text-emerald-400 font-mono">
                  :{currentPort}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#8696a0] truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                <span className="truncate">{statusConfig.label} (Port 3001)</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLeave}
            className="p-2 text-[#8696a0] hover:text-rose-400 hover:bg-[#111b21] rounded-lg transition"
            title="Leave & Switch Identity"
            aria-label="Leave chat"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#2a3942] rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3942]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-[#00a884]">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#e9edef]">Start a Conversation</h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8696a0]">
              Select an active participant to message directly, or join the general room:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  onSelectConversation("general");
                  setShowNewChatModal(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] transition text-left"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#e9edef]">General Chat</div>
                  <div className="text-[10px] text-[#8696a0]">{participants.length} connected participants</div>
                </div>
              </button>

              {participants
                .filter((p) => p.sessionId !== currentUser.sessionId)
                .map((p) => (
                  <button
                    key={p.sessionId}
                    onClick={() => {
                      onSelectConversation(p.sessionId);
                      setShowNewChatModal(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#202c33] transition text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-[#e9edef] text-xs font-bold">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#e9edef] truncate">{p.name}</div>
                      <div className="text-[10px] text-[#8696a0] truncate">{p.email}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
