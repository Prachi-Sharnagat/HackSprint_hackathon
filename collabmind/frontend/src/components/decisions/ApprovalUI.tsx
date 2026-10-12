"use client";

import React, { useState } from "react";
import { Check, X, ArrowRight, Sparkles, ShieldCheck, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

export interface ProposedUpdate {
  id?: string;
  type?: "task_update" | "doc_update";
  taskId?: string;
  targetId?: string;
  targetTitle?: string;
  taskTitle?: string;
  currentStatus?: string;
  proposedStatus?: string;
  currentPriority?: string;
  proposedPriority?: string;
  currentValue?: string;
  proposedValue?: string;
  rationale: string;
  assignee?: string;
  evidenceType?: "CONFIRMED_DEPENDENCY" | "AI_INFERRED_POSSIBILITY";
  evidenceSource?: string;
  approvalStatus: "pending" | "accepted" | "rejected";
  approvedBy?: string;
}

interface ApprovalUIProps {
  decisionId: string;
  roomId: string;
  proposals: ProposedUpdate[];
  onProposalUpdated: () => void;
  currentPersona?: { name: string; role: string };
}

export const ApprovalUI: React.FC<ApprovalUIProps> = ({
  decisionId,
  roomId,
  proposals,
  onProposalUpdated,
  currentPersona = { name: "Alex Rivera", role: "Tech Lead" }
}) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const getItemId = (item: ProposedUpdate) => {
    return item.targetId || item.taskId || item.id || "";
  };

  const handleApprove = async (item: ProposedUpdate) => {
    const id = getItemId(item);
    setLoadingItemId(id);
    try {
      const res = await fetch(
        `${backendUrl}/api/rooms/${roomId}/decisions/${decisionId}/approve-proposal/${id}?actor_name=${encodeURIComponent(
          currentPersona.name
        )}&actor_role=${encodeURIComponent(currentPersona.role)}`,
        { method: "POST" }
      );
      if (res.ok) {
        onProposalUpdated();
      }
    } catch (err) {
      console.error("Failed to approve proposal:", err);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleReject = async (item: ProposedUpdate) => {
    const id = getItemId(item);
    setLoadingItemId(id);
    try {
      const res = await fetch(
        `${backendUrl}/api/rooms/${roomId}/decisions/${decisionId}/reject-proposal/${id}?actor_name=${encodeURIComponent(
          currentPersona.name
        )}&actor_role=${encodeURIComponent(currentPersona.role)}`,
        { method: "POST" }
      );
      if (res.ok) {
        onProposalUpdated();
      }
    } catch (err) {
      console.error("Failed to reject proposal:", err);
    } finally {
      setLoadingItemId(null);
    }
  };

  if (!proposals || proposals.length === 0) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
        No task or documentation updates proposed for this decision.
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI-Proposed State Updates ({proposals.length})</span>
        </h4>
        <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          Requires Teammate Approval
        </span>
      </div>

      <div className="space-y-3">
        {proposals.map((item, idx) => {
          const itemId = getItemId(item);
          const isDecided = item.approvalStatus !== "pending";
          const isAccepted = item.approvalStatus === "accepted";
          const isConfirmedEvidence = item.evidenceType === "CONFIRMED_DEPENDENCY";
          const title = item.targetTitle || item.taskTitle || itemId;

          return (
            <div
              key={itemId || idx}
              className={`p-4 rounded-xl border transition ${
                isAccepted
                  ? "bg-emerald-950/20 border-emerald-500/40"
                  : item.approvalStatus === "rejected"
                  ? "bg-slate-900/30 border-slate-800/60 opacity-60"
                  : "bg-slate-900/80 border-slate-800 shadow-md"
              }`}
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Target: {itemId}
                    </span>
                    {/* Evidence Badge */}
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        isConfirmedEvidence
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {isConfirmedEvidence ? "🟢 Confirmed Dependency" : "🟡 AI-Inferred Possibility"}
                    </span>
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-white mt-0.5">{title}</h5>
                  {item.assignee && (
                    <span className="text-[11px] text-slate-400">Owner: {item.assignee}</span>
                  )}
                </div>

                {/* Resolution Status */}
                {isDecided && (
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border self-start ${
                      isAccepted
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    {isAccepted ? <ShieldCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>
                      {isAccepted
                        ? `Approved by ${item.approvedBy || currentPersona.name}`
                        : "Rejected"}
                    </span>
                  </span>
                )}
              </div>

              {/* State Transition Preview */}
              <div className="my-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
                {item.type === "doc_update" || !item.proposedStatus ? (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-400">Documentation Action:</span>
                    <span className="text-amber-300 font-bold">{item.proposedValue || "Needs Revision"}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Status transition */}
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 text-[11px]">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${getStatusBadge(item.currentStatus)}`}>
                        {(item.currentStatus || "todo").replace("_", " ")}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getStatusBadge(item.proposedStatus)}`}>
                        {(item.proposedStatus || "in_progress").replace("_", " ")}
                      </span>
                    </div>

                    {/* Priority transition */}
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 text-[11px]">Priority:</span>
                      <span className="text-slate-400 text-[11px]">{item.currentPriority || "medium"}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-amber-400 font-bold text-[11px]">{item.proposedPriority || "high"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Supporting Evidence Note */}
              <div className="text-[11px] text-slate-400 italic mb-3 space-y-1">
                <p>"{item.rationale}"</p>
                {item.evidenceSource && (
                  <p className="text-[10px] text-indigo-400 font-mono not-italic">
                    <strong>Evidence:</strong> {item.evidenceSource}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {!isDecided && (
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleReject(item)}
                    disabled={loadingItemId === itemId}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(item)}
                    disabled={loadingItemId === itemId}
                    className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {loadingItemId === itemId ? "Applying..." : `Approve & Apply (as ${currentPersona.name})`}
                    </span>
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
