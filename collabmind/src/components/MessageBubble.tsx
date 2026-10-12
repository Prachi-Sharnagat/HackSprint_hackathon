import React, { useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Reply,
  Copy,
  Trash2,
  Smile,
  ExternalLink,
  Video,
} from "lucide-react";
import { ChatMessage, ChatReply } from "../types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  searchQuery?: string;
  onReply?: (replyTarget: ChatReply) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDeleteForMe?: (messageId: string) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isFirstInGroup = true,
  isLastInGroup = true,
  searchQuery,
  onReply,
  onReact,
  onDeleteForMe,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Distinct colors for participant names in group chat
  const getSenderColor = (name: string) => {
    const colors = [
      "#53bdeb", // cyan/blue
      "#e59500", // warm amber
      "#2ec4b6", // teal
      "#e07a5f", // coral
      "#9d4edd", // violet
      "#ff70a6", // pink
      "#4ea8de", // light blue
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedToast(true);
    setShowMenu(false);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleReply = () => {
    setShowMenu(false);
    if (onReply) {
      onReply({
        id: message.id,
        senderName: message.senderName,
        content: message.content,
      });
    }
  };

  // Auto-link renderer with search highlighting
  const renderContentWithLinks = (text: string) => {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const isGoogleMeet = part.includes("meet.google.com");
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 font-medium underline break-all ${
              isGoogleMeet ? "text-emerald-400 hover:text-emerald-300 font-semibold" : "text-[#53bdeb] hover:text-[#7fd4fc]"
            }`}
          >
            {isGoogleMeet && <Video className="w-3.5 h-3.5 inline shrink-0" />}
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
          </a>
        );
      }

      // If search query is active, highlight matches
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.trim();
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matchRegex = new RegExp(`(${escaped})`, "gi");
        const subParts = part.split(matchRegex);

        return subParts.map((sub, sIdx) => {
          if (sub.toLowerCase() === query.toLowerCase()) {
            return (
              <mark
                key={`${index}-${sIdx}`}
                className="bg-amber-400/40 text-amber-200 px-0.5 rounded font-medium"
              >
                {sub}
              </mark>
            );
          }
          return sub;
        });
      }

      return part;
    });
  };

  const reactionsList = message.reactions
    ? Object.entries(message.reactions).filter(([_, users]) => users.length > 0)
    : [];

  return (
    <div
      className={`group flex w-full relative select-text transition-all ${
        isSelf ? "justify-end" : "justify-start"
      } ${isFirstInGroup ? "mt-2" : "mt-0.5"} ${isLastInGroup ? "mb-1" : "mb-0.5"}`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[72%] md:max-w-[65%] rounded-2xl px-3 pt-2 pb-1.5 shadow-sm text-[#e9edef] ${
          isSelf
            ? `bg-[#005c4b] ${isFirstInGroup ? "bubble-tail-out rounded-tr-xs" : ""}`
            : `bg-[#202c33] ${isFirstInGroup ? "bubble-tail-in rounded-tl-xs" : ""}`
        }`}
      >
        {/* Context Menu Trigger Chevron */}
        <div className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 transition z-10">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-[#8696a0] hover:text-[#e9edef] transition"
            title="Message options"
            aria-label="Message options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div
                className={`absolute top-7 w-48 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1 z-40 text-xs text-[#e9edef] animate-fade-in ${
                  isSelf ? "right-0" : "left-0"
                }`}
              >
                {/* Quick Emoji Reaction bar */}
                <div className="flex items-center justify-around px-2 py-1.5 border-b border-[#2a3942] bg-[#111b21]/70">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setShowMenu(false);
                        onReact?.(message.id, emoji);
                      }}
                      className="text-base hover:scale-125 transition active:scale-95 p-0.5"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleReply}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#111b21] flex items-center gap-2 transition"
                >
                  <Reply className="w-3.5 h-3.5 text-[#8696a0]" />
                  <span>Reply</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#111b21] flex items-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-[#8696a0]" />
                  <span>Copy text</span>
                </button>

                <div className="h-[1px] bg-[#2a3942] my-1" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteForMe?.(message.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete for me</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sender Name in Group Chat (only first message in group & incoming) */}
        {!isSelf && isFirstInGroup && (
          <div
            className="text-[12px] font-semibold mb-1 tracking-wide select-none cursor-default"
            style={{ color: getSenderColor(message.senderName) }}
          >
            {message.senderName}
          </div>
        )}

        {/* Quoted Reply Preview inside Bubble */}
        {message.replyTo && (
          <div className="mb-1.5 rounded-lg bg-black/20 border-l-[3.5px] border-[#00a884] px-2.5 py-1 text-xs select-none">
            <div className="font-semibold text-emerald-400 text-[11px]">
              {message.replyTo.senderName}
            </div>
            <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Message Content */}
        <div className="text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words pr-4">
          {renderContentWithLinks(message.content)}
        </div>

        {/* Timestamp and Sent Tick status */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0] select-none float-right ml-3 -mb-0.5">
          <span>{formatTime(message.timestamp)}</span>
          {isSelf && (
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
          )}
        </div>

        {/* Floating Reactions Pill */}
        {reactionsList.length > 0 && (
          <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-[#182229] border border-[#2a3942] rounded-full px-2 py-0.5 text-[11px] shadow-md z-10 cursor-pointer hover:bg-[#202c33] transition">
            {reactionsList.map(([emoji, users]) => (
              <span
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact?.(message.id, emoji);
                }}
                className="flex items-center gap-0.5 hover:scale-110 transition"
                title={`${users.join(", ")} reacted with ${emoji}`}
              >
                <span>{emoji}</span>
                {users.length > 1 && (
                  <span className="text-[9px] text-[#8696a0] font-mono font-medium">
                    {users.length}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Copied Toast */}
      {copiedToast && (
        <span className="absolute -top-6 bg-[#202c33] text-emerald-400 border border-[#2a3942] text-[10px] px-2 py-0.5 rounded shadow z-50 animate-fade-in">
          Copied to clipboard
        </span>
      )}
    </div>
  );
};
