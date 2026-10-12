"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, loginAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Google sign-in was canceled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    loginAsGuest(guestName.trim());
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-radial-gradient">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">CollabMind</h1>
            <p className="text-xs text-slate-400">Collaborate with AI Specialists</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Guest Demo Login (Fast access for Hackathon / Demos) */}
        <div className="mb-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Instant Guest Access
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Jump in immediately without configuring Firebase accounts:
          </p>
          <form onSubmit={handleGuestLogin} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter your name (e.g. Alex)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition"
            >
              Enter
            </button>
          </form>
        </div>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500">
            or sign in with credentials
          </span>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@team.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-indigo-600/20"
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-3 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium py-2 rounded-xl text-xs sm:text-sm transition"
        >
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
