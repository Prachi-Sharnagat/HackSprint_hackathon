"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { AgentTypingIndicator } from "@/components/agents/AgentTypingIndicator";
import { SlideOverWindow } from "@/components/agents/SlideOverWindow";
import { MeetingControls } from "@/components/meeting/MeetingControls";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { DecisionImpactPanel } from "@/components/decisions/DecisionImpactPanel";
import {
  MessageSquare,
  Kanban,
  Brain,
  ArrowLeft,
  Users,
  PanelRightOpen,
  Share2,
  Check,
  Radio,
  Sparkles,
  Video as MeetIcon,
} from "lucide-react";

export default function ChatRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "general";

  const { user } = useAuth();
  const {
    messages,
    activeUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    agentGenerating,
    activeArtifact,
    isSlideOverOpen,
    setIsSlideOverOpen,
    inspectArtifact,
  } = useChat(roomId);

  const [activeTab, setActiveTab] = useState<"chat" | "tasks" | "decisions">("chat");
  const [activeMeetUrl, setActiveMeetUrl] = useState<string | null>(null);
  const [taskRefreshCounter, setTaskRefreshCounter] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for Google OAuth callback parameters (?meetUrl=... or ?meetError=...)
  useEffect(() => {
    if (searchParams) {
      const meetUrlParam = searchParams.get("meetUrl");
      const meetSuccess = searchParams.get("meetSuccess");
      const meetError = searchParams.get("meetError");

      if (meetUrlParam) {
        setActiveMeetUrl(meetUrlParam);
        // Automatically broadcast the generated Google Meet link to the room
        sendMessage(`🎥 Google Meet started: ${meetUrlParam} - Click to join the video call!`);

        // Clean up URL parameters
        if (typeof window !== "undefined") {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      }

      if (meetError) {
        console.warn("Google Meet OAuth notice:", meetError);
      }
    }
  }, [searchParams]);

  // Auto-scroll in chat
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, agentGenerating, activeTab]);

  const handleShareRoom = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSummarizeMeeting = () => {
    sendMessage("@summarizer Summarize the decisions, meeting notes, and action items discussed so far.");
    setActiveTab("chat");
  };

  const handleBroadcastMeetLink = (url: string) => {
    sendMessage(`🎥 Google Meet session shared: ${url} - Teammates can join now!`);
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Workspace Top Header */}
        <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  #{roomId}
                </span>
                <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>Live</span>
                </span>
                {activeMeetUrl && (
                  <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                    <MeetIcon className="w-2.5 h-2.5" />
                    <span>Google Meet Connected</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {activeUsers.length > 0 ? activeUsers.length : 1} participant
                  {(activeUsers.length > 1 || activeUsers.length === 0) ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Chat & Meeting, Tasks, Decisions & Impact) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat & Meeting</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "tasks"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Task Board</span>
            </button>

            <button
              onClick={() => setActiveTab("decisions")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "decisions"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Decisions & Impact</span>
            </button>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareRoom}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Share Room link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Toggle Slide-Over Button */}
            <button
              onClick={() => setIsSlideOverOpen(!isSlideOverOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
                activeArtifact
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/40"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
              title="Toggle MindMap / Slides Drawer"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="hidden md:inline">Visual Canvas</span>
            </button>
          </div>
        </header>

        {/* Dynamic Pane Body */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Meeting Controls Bar at top with Google Meet Integration */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
              <MeetingControls
                roomId={roomId}
                activeMeetUrl={activeMeetUrl}
                onSetMeetUrl={setActiveMeetUrl}
                onBroadcastMeetLink={handleBroadcastMeetLink}
                onTriggerSummarizer={handleSummarizeMeeting}
                onLeaveMeeting={() => router.push("/")}
              />
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-2">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 mb-6 text-center max-w-xl mx-auto">
                <div className="inline-flex p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-white mb-1">
                  CollabMind Workspace #{roomId}
                </h2>
                <p className="text-xs text-slate-400">
                  Discuss ideas, launch <strong>Google Meet</strong> video calls, mention <code className="text-indigo-400">@mindmap</code>, or review the <strong>Task Board</strong> & <strong>Decisions & Impact</strong> tabs above.
                </p>
              </div>

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isCurrentUser={user ? msg.senderId === user.uid : msg.senderId.startsWith("guest-")}
                  onInspectArtifact={inspectArtifact}
                />
              ))}

              <AgentTypingIndicator
                agentName={agentGenerating}
                typingUsers={typingUsers}
              />

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <footer className="p-4 sm:p-6 bg-slate-950/80 border-t border-slate-800/80">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSendMessage={sendMessage}
                  onTyping={sendTyping}
                  disabled={false}
                />
              </div>
            </footer>
          </div>
        )}

        {activeTab === "tasks" && (
          <TaskBoard
            roomId={roomId}
            refreshTrigger={taskRefreshCounter}
          />
        )}

        {activeTab === "decisions" && (
          <DecisionImpactPanel
            roomId={roomId}
            onTasksChanged={() => setTaskRefreshCounter((c) => c + 1)}
          />
        )}
      </div>

      {/* Slide-Over Visual Window (Mind Maps & Slides) */}
      <SlideOverWindow
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        artifact={activeArtifact}
      />
    </div>
  );
}
