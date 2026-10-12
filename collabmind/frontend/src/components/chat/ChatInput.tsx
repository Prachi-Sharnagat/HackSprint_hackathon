"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles, Network, Presentation, FileText, Code2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

const AVAILABLE_AGENTS = [
  {
    tag: "@mindmap",
    name: "Mind Map",
    desc: "Generate Mermaid brainstorming diagrams",
    icon: Network,
    color: "text-indigo-400 bg-indigo-500/10",
  },
  {
    tag: "@ppt-maker",
    name: "Presentation",
    desc: "Generate multi-slide pitch decks",
    icon: Presentation,
    color: "text-pink-400 bg-pink-500/10",
  },
  {
    tag: "@summarizer",
    name: "Summarizer",
    desc: "Create bulleted decisions & action items",
    icon: FileText,
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    tag: "@coder",
    name: "Code Architect",
    desc: "Generate TypeScript / Python architecture blueprints",
    icon: Code2,
    color: "text-amber-400 bg-amber-500/10",
  },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [selectedAgentIdx, setSelectedAgentIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Typing debounce
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);

    // Mention trigger check
    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastWord = textBeforeCursor.split(/\s+/).pop() || "";

    if (lastWord.startsWith("@")) {
      setShowMentionMenu(true);
      setSelectedAgentIdx(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertAgentMention = (tag: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);
    const words = textBeforeCursor.split(/\s+/);
    words.pop(); // remove incomplete '@' word
    const prefix = words.length > 0 ? words.join(" ") + " " : "";
    const newText = `${prefix}${tag} ${textAfterCursor}`;
    setText(newText);
    setShowMentionMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAgentIdx((prev) => (prev + 1) % AVAILABLE_AGENTS.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAgentIdx((prev) => (prev - 1 + AVAILABLE_AGENTS.length) % AVAILABLE_AGENTS.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertAgentMention(AVAILABLE_AGENTS[selectedAgentIdx].tag);
        return;
      } else if (e.key === "Escape") {
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text);
    setText("");
    setShowMentionMenu(false);
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  return (
    <div className="relative w-full">
      {/* Quick Agent Mention Pills */}
      <div className="flex items-center space-x-1.5 mb-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-1 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Agents:</span>
        </span>
        {AVAILABLE_AGENTS.map((agent) => (
          <button
            key={agent.tag}
            type="button"
            onClick={() => insertAgentMention(agent.tag)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition whitespace-nowrap"
          >
            <agent.icon className="w-3 h-3 text-indigo-400" />
            <span className="font-mono text-[11px]">{agent.tag}</span>
          </button>
        ))}
      </div>

      {/* Mention Auto-Suggest Dropdown */}
      {showMentionMenu && (
        <div className="absolute bottom-full mb-2 left-0 w-80 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-20">
          <div className="p-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Mention an AI Specialist
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {AVAILABLE_AGENTS.map((agent, idx) => (
              <button
                key={agent.tag}
                type="button"
                onClick={() => insertAgentMention(agent.tag)}
                className={`w-full flex items-center space-x-2.5 p-2 rounded-lg text-left text-xs transition ${
                  idx === selectedAgentIdx
                    ? "bg-indigo-600/30 text-white border border-indigo-500/30"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div className={`p-1.5 rounded-md ${agent.color}`}>
                  <agent.icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">{agent.tag} <span className="text-slate-400 font-normal">({agent.name})</span></div>
                  <div className="text-[10px] text-slate-400">{agent.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field Container */}
      <div className="flex items-end space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-lg focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/50 transition">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or use @mindmap, @ppt-maker, @summarizer..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 resize-none text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none p-1.5 max-h-32 min-h-[38px]"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition flex items-center justify-center flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
