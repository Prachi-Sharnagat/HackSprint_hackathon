import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Sparkles,
  X,
  FileText,
  Image,
  Camera,
  BarChart2,
  Brain,
  Presentation,
  CheckSquare,
} from "lucide-react";
import { ChatReply } from "../types/chat";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";

interface MessageComposerProps {
  onSendMessage: (content: string, replyTo?: ChatReply) => void;
  onTyping?: (isTyping: boolean) => void;
  replyTarget?: ChatReply | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;

const EMOJI_CATEGORIES = {
  FrequentlyUsed: ["😀", "😂", "😍", "👍", "🔥", "🎉", "🙌", "❤️", "🙏", "✨"],
  Smiles: ["😊", "😎", "🤔", "🥳", "🤩", "😴", "💡", "🚀", "🤝", "💪"],
  Symbols: ["✅", "❌", "⚡", "⭐", "🎯", "📌", "💼", "📈", "📅", "🔒"],
};

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  replyTarget,
  onCancelReply,
  disabled,
}) => {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus textarea when replying
  useEffect(() => {
    if (replyTarget) {
      textareaRef.current?.focus();
    }
  }, [replyTarget]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    if (trimmed.length > MAX_LENGTH) return;

    onSendMessage(trimmed, replyTarget || undefined);
    setContent("");
    onCancelReply?.();
    setShowEmojiPicker(false);
    setShowAttachments(false);
    setShowAiMenu(false);

    // Stop typing immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_LENGTH) {
      setContent(val);

      // Auto adjust height up to 120px
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }

      // Throttled typing event
      if (onTyping) {
        onTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleInsertAgent = (mention: string, promptText?: string) => {
    const textToInsert = promptText ? `${mention} ${promptText}` : `${mention} `;
    setContent((prev) => (prev ? `${prev} ${textToInsert}` : textToInsert));
    setShowAiMenu(false);
    textareaRef.current?.focus();
  };

  return (
    <footer className="relative bg-[#202c33] border-t border-[#2a3942] z-20">
      {/* 1. Reply Preview Banner */}
      {replyTarget && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#182229] border-l-4 border-[#00a884] border-b border-[#2a3942] animate-fade-in select-none">
          <div className="min-w-0 pr-3">
            <span className="text-xs font-semibold text-[#25d366] block">
              Replying to {replyTarget.senderName}
            </span>
            <p className="text-xs text-[#8696a0] truncate mt-0.5">
              {replyTarget.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full transition shrink-0"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Emoji Picker Popover */}
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="absolute bottom-16 left-2 sm:left-4 z-40 shadow-2xl animate-fade-in border border-[#2a3942] rounded-2xl overflow-hidden max-w-[calc(100vw-24px)]">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(emojiData: EmojiClickData) => {
                insertEmoji(emojiData.emoji);
              }}
              lazyLoadEmojis={true}
              searchPlaceHolder="Search emoji..."
              width={340}
              height={400}
            />
          </div>
        </>
      )}

      {/* 3. Attachment Menu Popover */}
      {showAttachments && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowAttachments(false)}
          />
          <div className="absolute bottom-16 left-12 bg-[#202c33] border border-[#2a3942] rounded-2xl p-2 shadow-2xl z-40 w-48 text-xs text-[#e9edef] animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setShowAttachments(false);
                setContent((prev) => (prev ? `${prev} 📎 [Document attached]` : `📎 [Document attached]`));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Document</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAttachments(false);
                setContent((prev) => (prev ? `${prev} 🖼️ [Photo attached]` : `🖼️ [Photo attached]`));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition"
            >
              <Image className="w-4 h-4 text-emerald-400" />
              <span>Photos & Videos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAttachments(false);
                setContent((prev) => (prev ? `${prev} 📷 [Camera snapshot]` : `📷 [Camera snapshot]`));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition"
            >
              <Camera className="w-4 h-4 text-pink-400" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAttachments(false);
                setContent((prev) => (prev ? `${prev} 📊 [Poll: What should we build next?]` : `📊 [Poll: What should we build next?]`));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition"
            >
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <span>Poll</span>
            </button>
          </div>
        </>
      )}

      {/* 4. CollabMind AI Tools Popover */}
      {showAiMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowAiMenu(false)}
          />
          <div className="absolute bottom-16 left-20 bg-[#202c33] border border-[#2a3942] rounded-2xl p-2.5 shadow-2xl z-40 w-64 text-xs text-[#e9edef] animate-fade-in">
            <div className="flex items-center gap-2 px-2 py-1 mb-1 border-b border-[#2a3942] text-[11px] font-semibold text-[#8b7cff]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CollabMind AI Suite</span>
            </div>

            <button
              type="button"
              onClick={() => handleInsertAgent("@intelligence", "Summarize the recent discussion points")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition text-left"
            >
              <Brain className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <span className="font-medium block">Ask Meet Intelligence</span>
                <span className="text-[10px] text-[#8696a0]">Summarize meeting & notes</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInsertAgent("@mindmap", "Create a mind map for our feature roadmap")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition text-left"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-medium block">Generate Mind Map</span>
                <span className="text-[10px] text-[#8696a0]">Insert @mindmap command</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInsertAgent("@ppt-maker", "Generate presentation outline for pitch deck")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition text-left"
            >
              <Presentation className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-medium block">Create Presentation</span>
                <span className="text-[10px] text-[#8696a0]">Insert @ppt-maker command</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInsertAgent("@actions", "Extract all action items and assignees")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#111b21] rounded-xl transition text-left"
            >
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-medium block">Extract Action Items</span>
                <span className="text-[10px] text-[#8696a0]">Extract tasks from messages</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* 5. Main Composer Row */}
      <div className="px-3 py-2 flex items-end gap-2">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-0.5 pb-1 text-[#8696a0]">
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachments(false);
              setShowAiMenu(false);
            }}
            className={`p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition ${
              showEmojiPicker ? "text-[#00a884] bg-[#111b21]" : ""
            }`}
            title="Emoji"
            aria-label="Insert Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => {
              setShowAttachments(!showAttachments);
              setShowEmojiPicker(false);
              setShowAiMenu(false);
            }}
            className={`p-2 rounded-full hover:bg-[#111b21] hover:text-[#e9edef] transition ${
              showAttachments ? "text-[#00a884] bg-[#111b21]" : ""
            }`}
            title="Attach"
            aria-label="Attach File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* CollabMind AI Tools Button */}
          <button
            type="button"
            onClick={() => {
              setShowAiMenu(!showAiMenu);
              setShowEmojiPicker(false);
              setShowAttachments(false);
            }}
            className={`p-2 rounded-full hover:bg-[#111b21] hover:text-[#8b7cff] transition ${
              showAiMenu ? "text-[#8b7cff] bg-[#111b21]" : "text-[#8b7cff]/80"
            }`}
            title="CollabMind AI Tools"
            aria-label="CollabMind AI Tools"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Input Surface */}
        <div className="flex-1 bg-[#2a3942] rounded-2xl flex items-center px-3.5 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition min-h-[42px]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] resize-none outline-none max-h-28 min-h-[24px] py-1 leading-relaxed"
          />

          {content.length > 1800 && (
            <span className="text-[10px] text-amber-400 font-mono pl-2 shrink-0">
              {MAX_LENGTH - content.length}
            </span>
          )}
        </div>

        {/* Send Button */}
        <div className="pb-1">
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white flex items-center justify-center transition shrink-0 shadow-md"
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
