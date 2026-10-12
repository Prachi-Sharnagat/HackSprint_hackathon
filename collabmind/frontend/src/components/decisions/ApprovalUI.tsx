"use client";

import React, { useState } from "react";
import { Check, X, ArrowRight, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";

export interface ProposedTaskUpdate {
  taskId: string;
  taskTitle: string;
  currentStatus: string;
  proposedStatus: string;
  currentPriority: string;
  proposedPriority: string;
  rationale: string;
  approvalStatus: "pending" | "accepted" | "rejected";
}

interface ApprovalUIProps {
  decisionId: string;
  roomId: string;
  proposals: ProposedTaskUpdate[];
  onProposalUpdated: () => void;
}

export const ApprovalUI: React.FC<ApprovalUIProps> = ({
  decisionId,
  roomId,
  proposals,
  onProposalUpdated,
}) => {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const handleApprove = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await fetch(
        `${backendUrl}/api/rooms/${roomId}/decisions/${decisionId}/approve-proposal/${taskId}`,
        { method: "POST" }
      );
      if (res.ok) {
        onProposalUpdated();
      }
    } catch (err) {
      console.error("Failed to approve task proposal:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleReject = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await fetch(
        `${backendUrl}/api/rooms/${roomId}/decisions/${decisionId}/reject-proposal/${taskId}`,
        { method: "POST" }
      );
      if (res.ok) {
        onProposalUpdated();
      }
    } catch (err) {
      console.error("Failed to reject task proposal:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  if (!proposals || proposals.length === 0) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
        No task updates proposed for this decision.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "in_progress":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "blocked":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-700";
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "critical":
        return "text-rose-400 font-bold";
      case "high":
        return "text-amber-400 font-semibold";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI-Proposed Task Modifications ({proposals.length})</span>
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">Requires Approval</span>
      </div>

      <div className="space-y-2.5">
        {proposals.map((item) => {
          const isDecided = item.approvalStatus !== "pending";
          const isAccepted = item.approvalStatus === "accepted";

          return (
            <div
              key={item.taskId}
              className={`p-3.5 rounded-xl border transition ${
                isAccepted
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : item.approvalStatus === "rejected"
                  ? "bg-slate-900/40 border-slate-800 opacity-60"
                  : "bg-slate-900/80 border-slate-800 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Task ID: {item.taskId}
                  </span>
                  <h5 className="text-xs sm:text-sm font-semibold text-white">
                    {item.taskTitle}
                  </h5>
                </div>

                {/* Status indicator if already resolved */}
                {isDecided && (
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAccepted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {isAccepted ? <ShieldCheck className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{isAccepted ? "Approved & Synced" : "Rejected"}</span>
                  </span>
                )}
              </div>

              {/* Side-by-side transition preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                {/* Status Transition */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 text-[11px]">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${getStatusBadge(item.currentStatus)}`}>
                    {item.currentStatus.replace("_", " ")}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getStatusBadge(item.proposedStatus)}`}>
                    {item.proposedStatus.replace("_", " ")}
                  </span>
                </div>

                {/* Priority Transition */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 text-[11px]">Priority:</span>
                  <span className={`text-[11px] ${getPriorityBadge(item.currentPriority)}`}>
                    {item.currentPriority}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className={`text-[11px] font-bold ${getPriorityBadge(item.proposedPriority)}`}>
                    {item.proposedPriority}
                  </span>
                </div>
              </div>

              {/* Rationale explanation */}
              <p className="text-[11px] text-slate-400 italic mb-3">
                "{item.rationale}"
              </p>

              {/* Action Buttons */}
              {!isDecided && (
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleReject(item.taskId)}
                    disabled={loadingTaskId === item.taskId}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(item.taskId)}
                    disabled={loadingTaskId === item.taskId}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{loadingTaskId === item.taskId ? "Applying..." : "Approve & Update Task"}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
