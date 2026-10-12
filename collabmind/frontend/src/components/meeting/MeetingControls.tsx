"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Sparkles,
  Video as MeetIcon,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Radio,
  X,
  Share2,
} from "lucide-react";

interface MeetingControlsProps {
  roomId: string;
  activeMeetUrl?: string | null;
  onSetMeetUrl?: (url: string | null) => void;
  onTriggerSummarizer?: () => void;
  onLeaveMeeting?: () => void;
  onBroadcastMeetLink?: (url: string) => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  roomId,
  activeMeetUrl,
  onSetMeetUrl,
  onTriggerSummarizer,
  onLeaveMeeting,
  onBroadcastMeetLink,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(412); // Sample timer
  const [copied, setCopied] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [manualMeetInput, setManualMeetInput] = useState("");
  const [loadingOAuth, setLoadingOAuth] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyMeet = () => {
    if (!activeMeetUrl) return;
    navigator.clipboard.writeText(activeMeetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGoogleOAuth = async () => {
    setLoadingOAuth(true);
    try {
      const res = await fetch(`/api/auth/google/url?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("Failed to fetch Google OAuth URL:", err);
      // Fallback: Open instant meet
      window.open("https://meet.google.com/new", "_blank");
    } finally {
      setLoadingOAuth(false);
    }
  };

  const handleLaunchInstantMeet = () => {
    window.open("https://meet.google.com/new", "_blank");
    setShowMeetModal(false);
  };

  const handleSaveManualMeet = (e: React.FormEvent) => {
    e.preventDefault();
    let url = manualMeetInput.trim();
    if (!url) return;
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    if (onSetMeetUrl) onSetMeetUrl(url);
    if (onBroadcastMeetLink) onBroadcastMeetLink(url);
    setShowMeetModal(false);
    setManualMeetInput("");
  };

  return (
    <>
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        {/* Left: Recording & Google Meet Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold tracking-wider">REC {formatTimer(seconds)}</span>
          </div>

          {/* Active Google Meet Pill */}
          {activeMeetUrl ? (
            <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full text-xs text-emerald-300">
              <MeetIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                {activeMeetUrl.replace("https://", "")}
              </span>
              <button
                onClick={handleCopyMeet}
                className="p-1 hover:text-white rounded"
                title="Copy Google Meet Link"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <a
                href={activeMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-emerald-400 hover:text-white rounded"
                title="Open in Google Meet"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <button
              onClick={() => setShowMeetModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition"
            >
              <MeetIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Connect Google Meet</span>
            </button>
          )}
        </div>

        {/* Center: Audio / Video / Screenshare Controls */}
        <div className="flex items-center space-x-2">
          {/* Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Video */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center ${
              isVideoOff
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center ${
              isScreenSharing
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Join Call, Summarize, & Leave */}
        <div className="flex items-center space-x-2">
          {activeMeetUrl ? (
            <a
              href={activeMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Join Google Meet</span>
            </a>
          ) : (
            <button
              onClick={() => setShowMeetModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start Meet</span>
            </button>
          )}

          {onTriggerSummarizer && (
            <button
              onClick={onTriggerSummarizer}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
              title="Generate summary with @summarizer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Summarize</span>
            </button>
          )}

          <button
            onClick={onLeaveMeeting}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center"
            title="Leave Meeting"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Meet Launch Modal */}
      {showMeetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MeetIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Meet Integration</h3>
                  <p className="text-[11px] text-slate-400">Launch or connect video call for #{roomId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMeetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option 1: Google OAuth with Calendar API */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300">
                  Automated Google Meet Generation
                </span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Google OAuth
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Uses your configured Google Client ID to automatically create a Google Calendar event with Hangouts Meet conferencing.
              </p>
              <button
                type="button"
                onClick={handleStartGoogleOAuth}
                disabled={loadingOAuth}
                className="w-full mt-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium py-2 rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
              >
                <MeetIcon className="w-3.5 h-3.5" />
                <span>{loadingOAuth ? "Connecting..." : "Generate Google Meet Link"}</span>
              </button>
            </div>

            {/* Option 2: Instant Meet */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200">
                Instant Google Meet Room
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Opens <code>meet.google.com/new</code> directly in a new window so you can start right away.
              </p>
              <button
                type="button"
                onClick={handleLaunchInstantMeet}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-xl text-xs transition border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open meet.google.com/new</span>
              </button>
            </div>

            {/* Option 3: Paste Existing Meet Link */}
            <form onSubmit={handleSaveManualMeet} className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Or Share Existing Meet Link with Room
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={manualMeetInput}
                  onChange={(e) => setManualMeetInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualMeetInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition"
                >
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
