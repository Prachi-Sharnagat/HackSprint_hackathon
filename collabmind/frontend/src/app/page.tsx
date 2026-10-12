"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  Plus,
  ArrowRight,
  Network,
  Presentation,
  FileText,
  Code2,
  Users,
  LogOut,
  Radio,
} from "lucide-react";

const FEATURED_ROOMS = [
  {
    id: "hackathon-sprint",
    name: "🚀 Hack Sprint 2026",
    topic: "Building multi-agent collaborative workflows",
    activeCount: 4,
  },
  {
    id: "pitch-deck-prep",
    name: "📊 Seed Pitch Deck",
    topic: "Synthesizing slides with @ppt-maker",
    activeCount: 2,
  },
  {
    id: "architecture-design",
    name: "🧠 System Architecture",
    topic: "Mermaid mind mapping with @mindmap",
    activeCount: 3,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [newRoomName, setNewRoomName] = useState("");
  const [customRoomId, setCustomRoomId] = useState("");

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newRoomName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") || `room-${Date.now().toString(36)}`;
    router.push(`/chat/${id}`);
  };

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomId.trim()) return;
    router.push(`/chat/${customRoomId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">
              CollabMind
            </span>
            <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0
            </span>
          </div>
        </div>

        {/* User profile / actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  alt={user.displayName || "User"}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800"
                />
                <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                  {user.displayName}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-md shadow-indigo-600/20"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3 pt-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Real-Time Team Collaboration & AI Agents</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Brainstorm, Diagram & Present in <span className="bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">One Room</span>.
          </h1>
          <p className="text-sm md:text-base text-slate-400">
            Mention <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">@mindmap</code> to build instant Mermaid node diagrams, or <code className="text-pink-400 bg-slate-900 px-1 py-0.5 rounded">@ppt-maker</code> to turn chat transcripts into deck slides.
          </p>
        </div>

        {/* Quick Room Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Create Room */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Plus className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">Create New Workspace</h2>
              <p className="text-xs text-slate-400 mb-4">
                Start a fresh room for your team brainstorming session.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. Q4 Growth Sprint"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-xs sm:text-sm transition"
              >
                <span>Launch Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Join By ID */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">Join Existing Room</h2>
              <p className="text-xs text-slate-400 mb-4">
                Enter a room ID or paste an invite link to connect with teammates.
              </p>
            </div>

            <form onSubmit={handleJoinCustom} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. hackathon-sprint"
                value={customRoomId}
                onChange={(e) => setCustomRoomId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={!customRoomId.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium py-2 rounded-xl text-xs sm:text-sm transition border border-slate-700"
              >
                <span>Join Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Featured Rooms */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Active Community Rooms
            </h2>
            <span className="text-xs text-indigo-400">Live WebSockets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURED_ROOMS.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push(`/chat/${r.id}`)}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/70 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                      {r.name}
                    </span>
                    <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{r.activeCount} online</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{r.topic}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>Enter Chat</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Capabilities Grid */}
        <div className="pt-4 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Specialized Collaborative Agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
              <Network className="w-6 h-6 text-indigo-400 mb-2" />
              <div className="font-semibold text-sm text-white">@mindmap</div>
              <p className="text-xs text-slate-400 mt-1">
                Converts brainstorming into dynamic, zoomable Mermaid node graphs.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
              <Presentation className="w-6 h-6 text-pink-400 mb-2" />
              <div className="font-semibold text-sm text-white">@ppt-maker</div>
              <p className="text-xs text-slate-400 mt-1">
                Compiles multi-slide presentations with notes and bullet highlights.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
              <FileText className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="font-semibold text-sm text-white">@summarizer</div>
              <p className="text-xs text-slate-400 mt-1">
                Distills chat history into executive decisions and clear action items.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
              <Code2 className="w-6 h-6 text-amber-400 mb-2" />
              <div className="font-semibold text-sm text-white">@coder</div>
              <p className="text-xs text-slate-400 mt-1">
                Architects system components, schemas, and implementation code.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
