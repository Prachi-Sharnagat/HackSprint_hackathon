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
  CheckCircle2,
  Network,
  Kanban,
  FileText,
  ShieldCheck,
  Filter,
  Layers,
  X
} from "lucide-react";
import { ApprovalUI, ProposedUpdate } from "./ApprovalUI";

export interface DecisionFinding {
  id: string;
  category: string;
  item_name: string;
  finding_type: "CONFIRMED_DEPENDENCY" | "AI_INFERRED_POSSIBILITY";
  evidence: string;
  confidence: number;
  action_recommended: string;
}

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
    blast_radius_score?: "low" | "medium" | "high" | "critical";
    severity?: "low" | "medium" | "high" | "critical";
    elapsed_seconds?: number;
    confirmed_count?: number;
    inferred_count?: number;
    affected_subsystems?: string[];
    agent_contributions?: {
      impact_agent?: string;
      dependency_agent?: string;
      task_agent?: string;
      doc_agent?: string;
    };
    findings?: DecisionFinding[];
    risks?: string[];
    mitigation?: string;
  };
  proposedTaskUpdates?: ProposedUpdate[];
  proposedUpdates?: ProposedUpdate[];
}

interface DecisionImpactPanelProps {
  roomId: string;
  onTasksChanged?: () => void;
  currentPersona?: { name: string; role: string };
}

export const DecisionImpactPanel: React.FC<DecisionImpactPanelProps> = ({
  roomId,
  onTasksChanged,
  currentPersona = { name: "Alex Rivera", role: "Tech Lead" }
}) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<"all" | "confirmed" | "inferred">("all");

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

  const handleCreateDecision = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          createdBy: `${currentPersona.name} (${currentPersona.role})`,
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

  const setPreset = (title: string, desc: string) => {
    setNewTitle(title);
    setNewDesc(desc);
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
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] p-4 sm:p-8 overflow-y-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Multi-Agent Decision Impact Coordinator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Specialized agents (Impact, Dependency, Task, Documentation) synthesize verifiable findings and propose human-governed state updates.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Propose New Decision</span>
        </button>
      </div>

      {/* Decisions List */}
      <div className="space-y-6">
        {decisions.map((decision) => {
          const isExpanded = expandedDecisionId === decision.id;
          const impact = decision.impactAnalysis;
          const isAnalyzing = analyzingId === decision.id;
          const proposals = decision.proposedTaskUpdates || decision.proposedUpdates || [];
          const blastScore = impact?.blast_radius_score || impact?.severity || "medium";
          const findings = impact?.findings || [];

          const filteredFindings = findings.filter((f) => {
            if (findingFilter === "confirmed") return f.finding_type === "CONFIRMED_DEPENDENCY";
            if (findingFilter === "inferred") return f.finding_type === "AI_INFERRED_POSSIBILITY";
            return true;
          });

          return (
            <div
              key={decision.id}
              className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl transition"
            >
              {/* Decision Top Summary */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      ID: {decision.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
                        blastScore
                      )}`}
                    >
                      Blast Radius: {blastScore}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        decision.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}
                    >
                      Status: {decision.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Logged by {decision.createdBy} •{" "}
                      {new Date(decision.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mt-1">
                    {decision.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {decision.description}
                  </p>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-2 self-start">
                  <button
                    onClick={() => handleRunAnalysis(decision.id)}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 transition"
                    title="Re-run Multi-Agent Orchestration"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-indigo-400" : ""}`} />
                    <span className="hidden sm:inline">{isAnalyzing ? "Analyzing..." : "Re-Analyze"}</span>
                  </button>

                  <button
                    onClick={() =>
                      setExpandedDecisionId(isExpanded ? null : decision.id)
                    }
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Multi-Agent Analysis Report */}
              {isExpanded && impact && (
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
                  {/* Executive Summary Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Multi-Agent Consolidated Report</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {impact.elapsed_seconds ? `Synthesized in ${impact.elapsed_seconds}s` : "Analysis Ready"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {impact.summary}
                    </p>

                    {/* Subsystems Badges */}
                    {impact.affected_subsystems && impact.affected_subsystems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Impacted Subsystems:</span>
                        {impact.affected_subsystems.map((sub, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4 Specialized Agent Contributions Grid */}
                  {impact.agent_contributions && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold mb-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>⚡ Impact Agent</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {impact.agent_contributions.impact_agent}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold mb-1">
                          <Network className="w-3.5 h-3.5" />
                          <span>🔗 Dependency Agent</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {impact.agent_contributions.dependency_agent}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold mb-1">
                          <Kanban className="w-3.5 h-3.5" />
                          <span>📋 Task Agent</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {impact.agent_contributions.task_agent}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-pink-400 text-xs font-bold mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>📄 Documentation Agent</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {impact.agent_contributions.doc_agent}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Explainable Findings Table with Confirmed vs Inferred Badges */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Explainable Evidence & Impact Findings ({filteredFindings.length})
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          • {impact.confirmed_count || 0} Confirmed / {impact.inferred_count || 0} Inferred
                        </span>
                      </div>

                      {/* Filter buttons */}
                      <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                        <button
                          onClick={() => setFindingFilter("all")}
                          className={`px-2.5 py-0.5 rounded-lg font-medium transition ${
                            findingFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          All ({findings.length})
                        </button>
                        <button
                          onClick={() => setFindingFilter("confirmed")}
                          className={`px-2.5 py-0.5 rounded-lg font-medium transition ${
                            findingFilter === "confirmed" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          🟢 Confirmed
                        </button>
                        <button
                          onClick={() => setFindingFilter("inferred")}
                          className={`px-2.5 py-0.5 rounded-lg font-medium transition ${
                            findingFilter === "inferred" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          🟡 AI-Inferred
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {filteredFindings.map((finding) => {
                        const isConfirmed = finding.finding_type === "CONFIRMED_DEPENDENCY";
                        return (
                          <div
                            key={finding.id}
                            className={`p-3.5 rounded-xl border text-xs transition ${
                              isConfirmed
                                ? "bg-slate-950/70 border-emerald-500/20"
                                : "bg-slate-950/70 border-amber-500/20"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    isConfirmed
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  }`}
                                >
                                  {isConfirmed ? "🟢 Confirmed Dependency" : "🟡 AI-Inferred Possibility"}
                                </span>
                                <span className="font-bold text-white">{finding.item_name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">[{finding.category}]</span>
                              </div>

                              <span className="text-[10px] text-slate-500 font-mono">
                                Confidence: {Math.round((finding.confidence || 0.8) * 100)}%
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mb-1.5">
                              <strong className="text-slate-300">Evidence:</strong> {finding.evidence}
                            </p>

                            <div className="text-[11px] text-indigo-300 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                              <strong>Recommended Action:</strong> {finding.action_recommended}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Human Governance Approval UI */}
                  <div className="pt-4 border-t border-slate-800">
                    <ApprovalUI
                      decisionId={decision.id}
                      roomId={roomId}
                      proposals={proposals}
                      currentPersona={currentPersona}
                      onProposalUpdated={async () => {
                        await fetchDecisions();
                        if (onTasksChanged) onTasksChanged();
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Decision Proposal Modal with Presets */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Propose Project Decision</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Bar */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Demo Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPreset(
                      "Replace Firebase with PostgreSQL",
                      "Migrate authentication, session state, and persistence to PostgreSQL with relational migrations and SQLite persistence."
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
                >
                  ⚡ PostgreSQL Migration
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreset(
                      "Deprecate REST API for GraphQL Federation",
                      "Standardize all frontend and mobile client queries through Apollo GraphQL gateway."
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700 transition"
                >
                  🔄 GraphQL Adoption
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreset(
                      "Enforce Strict Redis WebSocket Session Store",
                      "Implement distributed Redis session caching with 15-minute token TTL for multi-user sync."
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition"
                >
                  🔐 Redis Session Store
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Decision Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replace Firebase with PostgreSQL"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Scope & Architectural Rationale
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this decision is being considered and what components it affects..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>
                  <strong className="text-slate-300">Proposing Persona:</strong> {currentPersona.name} ({currentPersona.role})
                </p>
                <p className="text-[10px] text-indigo-400">
                  Submitting triggers the Multi-Agent engine (Impact, Dependency, Task, Documentation agents).
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
                >
                  Trigger Multi-Agent Analysis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
