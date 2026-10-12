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
import { DashboardView } from "@/components/dashboard/DashboardView";
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
  LayoutDashboard,
  UserCheck,
  ChevronDown
} from "lucide-react";

const PERSONAS = [
  { id: "alex", name: "Alex Rivera", role: "Tech Lead", avatar: "A", color: "from-indigo-600 to-blue-600" },
  { id: "sarah", name: "Sarah Chen", role: "Frontend Eng", avatar: "S", color: "from-pink-600 to-rose-600" },
  { id: "david", name: "David Kumar", role: "Product Manager", avatar: "D", color: "from-amber-600 to-orange-600" },
  { id: "elena", name: "Elena Rostova", role: "DevOps Lead", avatar: "E", color: "from-emerald-600 to-teal-600" },
];

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

  const [activeTab, setActiveTab] = useState<"dashboard" | "decisions" | "tasks" | "chat">("dashboard");
  const [activeMeetUrl, setActiveMeetUrl] = useState<string | null>(null);
  const [taskRefreshCounter, setTaskRefreshCounter] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentPersona, setCurrentPersona] = useState(PERSONAS[0]);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [brainstormInput, setBrainstormInput] = useState("");
  const [brainstormLoading, setBrainstormLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Check for Google OAuth callback parameters (?meetUrl=... or ?meetError=...)
  useEffect(() => {
    if (searchParams) {
      const meetUrlParam = searchParams.get("meetUrl");
      if (meetUrlParam) {
        setActiveMeetUrl(meetUrlParam);
        sendMessage(`🎥 Google Meet started: ${meetUrlParam} - Click to join the video call!`);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", window.location.pathname);
        }
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

  const handleBrainstormSubmit = async (promptText: string) => {
    if (!promptText.trim()) return;
    setBrainstormLoading(true);
    sendMessage(`💡 [Brainstorming Query by ${currentPersona.name}]: "${promptText}"`);
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/chat/brainstorm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          actorName: `${currentPersona.name} (${currentPersona.role})`
        })
      });
      if (res.ok) {
        const json = await res.json();
        sendMessage(`🤖 **CollabMind AI Insight:**\n\n${json.reply}`);
      }
    } catch (err) {
      console.error("Brainstorm error:", err);
    } finally {
      setBrainstormLoading(false);
      setBrainstormInput("");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header & Persona Governance Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
              title="Return to room list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-600/30">
                CM
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-white capitalize">
                    {roomId.replace(/-/g, " ")}
                  </span>
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live State</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Project Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("decisions")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "decisions"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Decisions & Impact</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "tasks"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Task Board</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat & Brainstorm</span>
            </button>
          </div>

          {/* Header Action Controls & Teammate Persona Switcher */}
          <div className="flex items-center space-x-2">
            {/* Teammate Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition"
                title="Switch active teammate persona"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr ${currentPersona.color} flex items-center justify-center text-white text-[10px] font-bold`}
                >
                  {currentPersona.avatar}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-bold text-white leading-tight">
                    {currentPersona.name}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono leading-tight">
                    {currentPersona.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Persona Selector Dropdown */}
              {showPersonaDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Teammate Persona:
                  </div>
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setCurrentPersona(p);
                        setShowPersonaDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition ${
                        currentPersona.id === p.id
                          ? "bg-indigo-600/20 text-white border border-indigo-500/40"
                          : "hover:bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-tr ${p.color} flex items-center justify-center text-white text-[10px] font-bold`}
                      >
                        {p.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

        {/* Mobile Subheader Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around bg-slate-950 border-b border-slate-800/80 px-2 py-1.5 text-[11px]">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-2 py-1 rounded-lg font-bold ${activeTab === "dashboard" ? "text-indigo-400" : "text-slate-400"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("decisions")}
            className={`px-2 py-1 rounded-lg font-bold ${activeTab === "decisions" ? "text-indigo-400" : "text-slate-400"}`}
          >
            Decisions
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-2 py-1 rounded-lg font-bold ${activeTab === "tasks" ? "text-indigo-400" : "text-slate-400"}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-2 py-1 rounded-lg font-bold ${activeTab === "chat" ? "text-indigo-400" : "text-slate-400"}`}
          >
            Chat
          </button>
        </div>

        {/* Dynamic Pane Body */}
        {activeTab === "dashboard" && (
          <DashboardView
            roomId={roomId}
            onNavigateToDecisions={() => setActiveTab("decisions")}
            onNavigateToTasks={() => setActiveTab("tasks")}
          />
        )}

        {activeTab === "decisions" && (
          <DecisionImpactPanel
            roomId={roomId}
            currentPersona={currentPersona}
            onTasksChanged={() => setTaskRefreshCounter((c) => c + 1)}
          />
        )}

        {activeTab === "tasks" && (
          <TaskBoard
            roomId={roomId}
            refreshTrigger={taskRefreshCounter}
          />
        )}

        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Meeting Controls Bar */}
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

            {/* Quick AI Brainstorming Prompt Bar */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Brainstorm:</span>
              </span>
              <button
                onClick={() => handleBrainstormSubmit("What happens if we replace Firebase with PostgreSQL?")}
                disabled={brainstormLoading}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 text-[11px] transition"
              >
                What happens if we switch to PostgreSQL?
              </button>
              <button
                onClick={() => handleBrainstormSubmit("Which tasks are currently blocked or critical priority?")}
                disabled={brainstormLoading}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 text-[11px] transition"
              >
                Which tasks are blocked or critical?
              </button>
              <button
                onClick={() => handleBrainstormSubmit("What project documents and PRDs need updating?")}
                disabled={brainstormLoading}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 text-[11px] transition"
              >
                What PRDs and architecture docs need updates?
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-2">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 mb-6 text-center max-w-xl mx-auto">
                <div className="inline-flex p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-white mb-1">
                  CollabMind Collaborative Brainstorming #{roomId}
                </h2>
                <p className="text-xs text-slate-400">
                  Discuss ideas, launch <strong>Google Meet</strong> calls, mention <code className="text-indigo-400">@mindmap</code> or <code className="text-pink-400">@ppt-maker</code>, or test the <strong>Decisions & Impact</strong> multi-agent pipeline.
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
