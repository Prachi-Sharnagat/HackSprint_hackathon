"use client";

import React from "react";
import { ChatMessage } from "@/hooks/useChat";
import { Bot, User, Presentation, Network, Copy, Check } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onInspectArtifact?: (text: string, agentTag?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onInspectArtifact,
}) => {
  const [copied, setCopied] = React.useState(false);
  const isAgent = message.senderType === "agent";
  const hasMermaid = /```mermaid/.test(message.text);
  const hasSlides = /```json[\s\S]*?"slides"/.test(message.text);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render stylized text
  const renderFormattedContent = (content: string) => {
    // If it's a slide JSON or mermaid, replace the large raw block with a clean call-to-action
    let displayContent = content;

    if (hasMermaid) {
      displayContent = displayContent.replace(
        /```mermaid[\s\S]*?```/g,
        "\n> 🧠 **Mind Map Generated**: Click the *'View Diagram'* button below to view and interact with the node chart.\n"
      );
    }

    if (hasSlides) {
      displayContent = displayContent.replace(
        /```json[\s\S]*?```/g,
        "\n> 📊 **Presentation Slides Generated**: Click the *'View Slide Deck'* button below to navigate and review slides.\n"
      );
    }

    return (
      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
        {displayContent}
      </div>
    );
  };

  return (
    <div
      className={`flex w-full mb-4 group ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[85%] md:max-w-[75%] lg:max-w-[65%] space-x-3 ${
          isCurrentUser ? "flex-row-reverse space-x-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isAgent ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-4 h-4" />
            </div>
          ) : message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex flex-col">
          {/* Header info */}
          <div
            className={`flex items-center space-x-2 mb-1 text-[11px] text-slate-400 ${
              isCurrentUser ? "justify-end" : "justify-start"
            }`}
          >
            <span className="font-semibold text-slate-300">
              {message.senderName}
            </span>
            {message.agentTag && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                {message.agentTag}
              </span>
            )}
            <span>•</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>

          {/* Bubble Box */}
          <div
            className={`relative p-3.5 rounded-2xl shadow-md ${
              isCurrentUser
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : isAgent
                ? "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm"
                : "bg-slate-800/90 text-slate-200 border border-slate-700/50 rounded-tl-sm"
            }`}
          >
            {renderFormattedContent(message.text)}

            {/* Visual Artifact Interactive Triggers */}
            {(hasMermaid || hasSlides) && onInspectArtifact && (
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-wrap gap-2">
                {hasMermaid && (
                  <button
                    onClick={() => onInspectArtifact(message.text, message.agentTag)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>View Diagram Canvas</span>
                  </button>
                )}

                {hasSlides && (
                  <button
                    onClick={() => onInspectArtifact(message.text, message.agentTag)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 transition"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>View Slide Deck</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Action Copy Button on Hover */}
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1 rounded bg-slate-900/60 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
              title="Copy text"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
