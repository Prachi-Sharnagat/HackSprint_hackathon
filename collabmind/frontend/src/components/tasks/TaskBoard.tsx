"use client";

import React, { useState, useEffect } from "react";
import {
  Kanban,
  Plus,
  Clock,
  User,
  Tag,
  Link2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

export interface Task {
  id: string;
  roomId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  tags: string[];
  dependencies: string[];
  createdAt: number;
  updatedAt: number;
}

interface TaskBoardProps {
  roomId: string;
  refreshTrigger?: number;
}

const COLUMNS: Array<{ id: Task["status"]; label: string; color: string; border: string }> = [
  { id: "todo", label: "To Do", color: "bg-slate-500/10 text-slate-300", border: "border-slate-800" },
  { id: "in_progress", label: "In Progress", color: "bg-indigo-500/10 text-indigo-400", border: "border-indigo-500/30" },
  { id: "blocked", label: "Blocked", color: "bg-rose-500/10 text-rose-400", border: "border-rose-500/30" },
  { id: "done", label: "Done", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({ roomId, refreshTrigger }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("Alex");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newTags, setNewTags] = useState("backend, api");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch room tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [roomId, refreshTrigger]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`${backendUrl}/api/rooms/${roomId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          priority: newPriority,
          assignee: newAssignee.trim() || "Unassigned",
          tags: newTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle("");
        setNewDesc("");
        await fetchTasks();
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      // Optimistic local update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      await fetch(`${backendUrl}/api/rooms/${roomId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchTasks();
    }
  };

  const getPriorityStyle = (priority: Task["priority"]) => {
    switch (priority) {
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
    <div className="flex-1 flex flex-col h-full bg-[#090d16] p-6 overflow-hidden">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Kanban className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Interactive Task Board
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synchronized team tasks, priorities, and dependency graphs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col max-h-full overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({colTasks.length})
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-lg space-y-3 transition group"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {task.id}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Dependencies */}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="flex items-center space-x-1.5 text-[10px] text-amber-400/90 bg-amber-950/20 px-2 py-1 rounded border border-amber-500/20">
                        <Link2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          Depends on: {task.dependencies.join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Footer Assignee & Status Shift */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                          {task.assignee ? task.assignee[0].toUpperCase() : "U"}
                        </div>
                        <span className="text-[11px] truncate max-w-[80px]">
                          {task.assignee}
                        </span>
                      </div>

                      {/* Quick Status Shift Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleUpdateStatus(task.id, e.target.value as Task["status"])
                        }
                        className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-600 italic">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal to Create New Task */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Create New Task</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement WebSocket heartbeat"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task details and deliverables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend, database, sprint"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
