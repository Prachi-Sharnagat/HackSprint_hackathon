"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AgentTypingIndicatorProps {
  agentName?: string | null;
  typingUsers?: string[];
}

export const AgentTypingIndicator: React.FC<AgentTypingIndicatorProps> = ({
  agentName,
  typingUsers = [],
}) => {
  if (!agentName && (!typingUsers || typingUsers.length === 0)) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-400">
      {agentName ? (
        <div className="flex items-center space-x-2 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span className="font-medium">{agentName} is generating...</span>
          <div className="flex space-x-1 pl-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
          </div>
        </div>
      ) : typingUsers.length > 0 ? (
        <div className="flex items-center space-x-1.5 text-slate-400">
          <span className="italic">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing`
              : `${typingUsers.join(", ")} are typing`}
          </span>
          <div className="flex space-x-1 pl-0.5">
            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
