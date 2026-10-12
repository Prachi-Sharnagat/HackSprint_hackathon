import React, { useState } from "react";
import { MessageSquare, ShieldAlert, ArrowRight, User, Mail, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { ChatUser, ConnectionStatus } from "../types/chat";

interface JoinChatProps {
  onJoin: (user: ChatUser) => void;
  connectionStatus: ConnectionStatus;
  initialUser?: ChatUser | null;
}

export const JoinChat: React.FC<JoinChatProps> = ({ onJoin, connectionStatus, initialUser }) => {
  const currentPort = typeof window !== "undefined" ? window.location.port || "5173" : "5173";

  // Pre-fill suggestion based on current port
  const defaultPresets: Record<string, { name: string; email: string }> = {
    "5173": { name: "Alice Chen", email: "alice@collabmind.io" },
    "5174": { name: "Bob Martin", email: "bob@collabmind.io" },
    "5175": { name: "Charlie Davis", email: "charlie@collabmind.io" },
  };

  const preset = defaultPresets[currentPort] || { name: "Alex Taylor", email: "alex@collabmind.io" };

  const [name, setName] = useState(initialUser?.name || preset.name);
  const [email, setEmail] = useState(initialUser?.email || preset.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your display name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g. alex@example.com).");
      return;
    }

    // Generate a unique temporary session ID on the client
    const sessionId =
      initialUser?.sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onJoin({
      sessionId,
      name: trimmedName,
      email: trimmedEmail,
    });
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-[#25d366] border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
            Backend Ready (Port 3001)
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Connecting to Backend...
          </span>
        );
      case "disconnected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Backend Disconnected
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0b141a] text-[#e9edef] relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b7cff]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00a884]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8b7cff] to-[#00a884] p-[2px] shadow-lg mb-3">
            <div className="w-full h-full rounded-2xl bg-[#111b21] flex items-center justify-center text-[#e9edef]">
              <MessageSquare className="w-7 h-7 text-[#00a884]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e9edef] flex items-center gap-2">
            CollabMind <span className="text-xs px-2 py-0.5 rounded bg-[#8b7cff]/15 text-[#8b7cff] border border-[#8b7cff]/30 font-medium font-mono">Web</span>
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            WhatsApp Web-Quality Multi-Client Chat
          </p>

          <div className="mt-3">{getStatusBadge()}</div>
        </div>

        {/* Quick Identity Selector (for testing multi-port sync) */}
        <div className="mb-5 p-2.5 bg-[#202c33] rounded-2xl border border-[#2a3942]">
          <span className="text-[10px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-1.5 px-1">
            Quick Identities for Port Testing
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Alice (5173)", name: "Alice Chen", email: "alice@collabmind.io" },
              { label: "Bob (5174)", name: "Bob Martin", email: "bob@collabmind.io" },
              { label: "Charlie (5175)", name: "Charlie Davis", email: "charlie@collabmind.io" },
            ].map((p) => {
              const isSelected = name === p.name;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setName(p.name);
                    setEmail(p.email);
                  }}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-medium transition text-center truncate ${
                    isSelected
                      ? "bg-[#00a884] text-[#111b21] font-bold"
                      : "bg-[#111b21] text-[#8696a0] hover:text-[#e9edef]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1.5">
              Display Name <span className="text-[#00a884]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice Chen"
                className="w-full bg-[#0b141a] border border-[#2a3942] focus:border-[#00a884] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0]/60 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1.5">
              Email Address <span className="text-[#00a884]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alice@example.com"
                className="w-full bg-[#0b141a] border border-[#2a3942] focus:border-[#00a884] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0]/60 outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider">
                Password
              </label>
              <span className="text-[10px] text-amber-400 font-mono">(Demo Only)</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (not checked or stored)"
                className="w-full bg-[#0b141a] border border-[#2a3942] focus:border-[#00a884] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0]/60 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-[#111b21] font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-950/40"
          >
            <span>Enter CollabMind Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Port Helper Tip */}
        <div className="mt-6 pt-4 border-t border-[#2a3942] text-center text-[11px] text-[#8696a0]">
          Running on port <code className="text-[#25d366] font-mono bg-[#0b141a] px-1.5 py-0.5 rounded border border-[#2a3942]">{currentPort}</code>
          <br />
          Open on ports <span className="text-[#e9edef] font-mono">5173</span>, <span className="text-[#e9edef] font-mono">5174</span>, and <span className="text-[#e9edef] font-mono">5175</span> to test 3-way synchronization.
        </div>
      </div>
    </div>
  );
};
