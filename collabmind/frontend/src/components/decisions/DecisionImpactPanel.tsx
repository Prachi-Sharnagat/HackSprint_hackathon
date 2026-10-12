"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Plus,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck2,
} from "lucide-react";
import { ApprovalUI, ProposedTaskUpdate } from "./ApprovalUI";

export interface Decision {
  id: string;
  roomId: string;
  title: string;
  description: string;
  status: "proposed" | "approved" | "rejected";
  createdBy: string;
  createdAt: number;
  impactAnalysis?: {
    summary?: string;
    severity?: "low" | "medium" | "high" | "critical";
    affectedTaskIds?: string[];
    risks?: string[];
    mitigation?: string;
  };
  proposedTaskUpdates?: ProposedTaskUpdate[];
}

interface DecisionImpactPanelProps {
  roomId: string;
  onTasksChanged?: () => void;
}

export const DecisionImpactPanel: React.FC<DecisionImpactPanelProps> = ({
  roomId,
  onTasksChanged,
}) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const fetchDecisions = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/decisions`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(data.decisions || []);
        if (data.decisions?.length > 0 && !expandedDecisionId) {
          setExpandedDecisionId(data.decisions[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch decisions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [roomId]);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewTitle("");
        setNewDesc("");
        await fetchDecisions();
        if (onTasksChanged) onTasksChanged();
      }
    } catch (err) {
      console.error("Failed to create decision:", err);
    }
  };

  const handleRunAnalysis = async (decisionId: string) => {
    setAnalyzingId(decisionId);
    try {
      const res = await fetch(
        `${backendUrl}/api/rooms/${roomId}/decisions/${decisionId}/analyze-impact`,
        { method: "POST" }
      );
      if (res.ok) {
        await fetchDecisions();
        if (onTasksChanged) onTasksChanged();
      }
    } catch (err) {
      console.error("Failed to run decision analysis:", err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "high":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "medium":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] p-6 overflow-y-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Decision & Impact Coordinator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vertex AI Agent Builder interprets team decisions, calculates impact, and coordinates task updates with Gemini function calling.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Decision</span>
        </button>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {decisions.map((decision) => {
          const isExpanded = expandedDecisionId === decision.id;
          const impact = decision.impactAnalysis;
          const isAnalyzing = analyzingId === decision.id;

          return (
            <div
              key={decision.id}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl transition"
            >
              {/* Decision Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {decision.id}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        impact?.severity
                      )}`}
                    >
                      Impact: {impact?.severity || "Evaluation"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Logged by {decision.createdBy} •{" "}
                      {new Date(decision.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {decision.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {decision.description}
                  </p>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRunAnalysis(decision.id)}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 border border-slate-700 transition"
                    title="Re-run Vertex AI Gemini Function Calling"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-indigo-400" : ""}`} />
                    <span className="hidden sm:inline">{isAnalyzing ? "Analyzing..." : "Re-Analyze"}</span>
                  </button>

                  <button
                    onClick={() =>
                      setExpandedDecisionId(isExpanded ? null : decision.id)
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && impact && (
                <div className="mt-5 pt-5 border-t border-slate-800 space-y-5">
                  {/* Impact Summary & Risks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Impact Analysis Summary</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {impact.summary}
                      </p>
                      {impact.mitigation && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <strong className="text-slate-300">Recommended Action:</strong>{" "}
                          {impact.mitigation}
                        </div>
                      )}
                    </div>

                    {/* Risk Factors */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Identified Risk Factors</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {impact.risks?.map((risk, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Approval UI Section */}
                  <div className="pt-2">
                    <ApprovalUI
                      decisionId={decision.id}
                      roomId={roomId}
                      proposals={decision.proposedTaskUpdates || []}
                      onProposalUpdated={() => {
                        fetchDecisions();
                        if (onTasksChanged) onTasksChanged();
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {decisions.length === 0 && !loading && (
          <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
            <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No decisions logged yet</h4>
            <p className="text-xs text-slate-500 mt-1">
              Click "Log New Decision" to simulate team decisions and test Gemini impact analysis.
            </p>
          </div>
        )}
      </div>

      {/* Modal to Log New Decision */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span>Log Team Decision</span>
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Decision Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Switch primary API protocol to WebSocket streaming"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Context & Architectural Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the trade-offs, rationale, and services affected..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                Vertex AI Agent Builder will automatically evaluate this decision using Gemini function calling tools (<code>analyze_impact</code>, <code>get_related_tasks</code>, <code>propose_task_updates</code>).
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  Submit & Analyze Impact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
