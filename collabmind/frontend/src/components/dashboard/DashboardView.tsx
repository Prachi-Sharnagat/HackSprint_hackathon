"use client";

import React, { useState, useEffect } from "react";
import {
  Kanban,
  FileText,
  Network,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Users,
  Layers,
  Activity,
  FileCode2,
  Presentation
} from "lucide-react";

interface DashboardData {
  roomId: string;
  metrics: {
    totalTasks: number;
    blockedTasks: number;
    criticalTasks: number;
    documentsCount: number;
    dependenciesCount: number;
    risksCount: number;
    decisionsCount: number;
  };
  tasks: Array<any>;
  documents: Array<{
    id: string;
    title: string;
    doc_type: string;
    url_or_path: string;
    summary: string;
    last_updated: number;
  }>;
  dependencies: Array<{
    id: string;
    source_item: string;
    target_item: string;
    relation_type: string;
    evidence_note: string;
  }>;
  risks: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    mitigation: string;
  }>;
  activity: Array<{
    id: string;
    actor_name: string;
    actor_role: string;
    action_type: string;
    target_item: string;
    details: string;
    created_at: number;
  }>;
  proactiveInsights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
  }>;
}

interface DashboardViewProps {
  roomId: string;
  onNavigateToDecisions?: () => void;
  onNavigateToTasks?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  roomId,
  onNavigateToDecisions,
  onNavigateToTasks
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [roomId]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
        <span>Loading shared workspace telemetry...</span>
      </div>
    );
  }

  const { metrics, proactiveInsights, documents, dependencies, risks, activity } = data;

  const getDocIcon = (type: string) => {
    switch (type) {
      case "PRD":
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case "Architecture":
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case "Technical Spec":
        return <FileCode2 className="w-4 h-4 text-amber-400" />;
      case "Presentation":
        return <Presentation className="w-4 h-4 text-pink-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] overflow-y-auto p-4 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Workspace State
            </span>
            <span className="text-xs text-slate-500">• SQLite Persistent Store</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Project Intelligence & Collaboration
          </h1>
          <p className="text-xs text-slate-400">
            Real-time downstream impact coordination, evidence verification, and shared teammate governance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh State</span>
          </button>
          {onNavigateToDecisions && (
            <button
              onClick={onNavigateToDecisions}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Propose Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={onNavigateToTasks}
          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sprint Tasks</span>
            <Kanban className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalTasks}</div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics.criticalTasks} critical priority</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Blockers</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${metrics.blockedTasks > 0 ? "text-rose-400" : "text-emerald-400"}`} />
          </div>
          <div className={`text-2xl font-black ${metrics.blockedTasks > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {metrics.blockedTasks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires alignment</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Deliverables</span>
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.documentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">PRDs & specs</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Graph Links</span>
            <Network className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.dependenciesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verifiable evidence</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Risks</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics.risksCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Mitigations tracked</div>
        </div>

        <div
          onClick={onNavigateToDecisions}
          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Decisions</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.decisionsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Human-governed</div>
        </div>
      </div>

      {/* Proactive Insights Banner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Proactive AI Intelligence & System Alerts</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">Evidence-Backed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proactiveInsights.map((ins) => (
            <div
              key={ins.id}
              className={`p-4 rounded-2xl border transition ${
                ins.severity === "high"
                  ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                  : "bg-slate-900/60 border-slate-800/80 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ins.severity === "high" ? "bg-rose-400 animate-pulse" : "bg-indigo-400"
                  }`}
                />
                <span className="text-white">{ins.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{ins.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Documents & Explicit Dependencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deliverables & Documents */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Project Deliverables & Specs ({documents.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Workspace Registry</span>
          </div>

          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                    {getDocIcon(doc.doc_type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{doc.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {doc.doc_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{doc.summary}</p>
                    <span className="text-[10px] text-indigo-400 font-mono mt-1 block">
                      {doc.url_or_path}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explicit Graph Dependencies */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Network className="w-4 h-4 text-indigo-400" />
              <span>Explicit Graph Dependencies ({dependencies.length})</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-mono">Verified Evidence</span>
          </div>

          <div className="space-y-2.5">
            {dependencies.map((dep) => (
              <div
                key={dep.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {dep.source_item}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {dep.target_item}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {dep.relation_type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 italic">"{dep.evidence_note}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shared Teammate Activity Audit Log */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-pink-400" />
            <span>Shared Teammate Activity Audit Log</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Real-Time Governance</span>
        </div>

        <div className="space-y-2">
          {activity.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {act.actor_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{act.actor_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.2 rounded">
                      {act.actor_role}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        act.action_type.includes("APPROVED")
                          ? "bg-emerald-500/20 text-emerald-300"
                          : act.action_type.includes("REJECTED")
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {act.action_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">{act.details}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap flex items-center space-x-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>{new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
