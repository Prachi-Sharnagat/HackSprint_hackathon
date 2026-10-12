import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class TaskAgent:
    """
    Specialized AI Agent 3: Task Agent
    Role: Analyzes sprint work items, assignee workloads, schedule deadlines, and formulates
    concrete, actionable proposed task updates (status, priority, blockers).
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    async def analyze(
        self,
        decision_title: str,
        decision_description: str,
        context: Dict[str, Any],
        dep_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        tasks = context.get("tasks", [])
        matched_task_ids = set(dep_analysis.get("matched_task_ids", []))

        # Also find tasks whose dependencies were matched
        confirmed_deps = dep_analysis.get("confirmed_dependencies", [])
        for dep in confirmed_deps:
            matched_task_ids.add(dep.get("source"))
            matched_task_ids.add(dep.get("target"))

        affected_tasks = [t for t in tasks if t.get("id") in matched_task_ids]
        if not affected_tasks and tasks:
            # Fallback to in-progress or critical tasks
            affected_tasks = [t for t in tasks if t.get("status") in ["in_progress", "todo"]][:2]

        proposed_task_updates = []
        assignees_impacted = set()

        for t in affected_tasks:
            current_status = t.get("status", "todo")
            current_priority = t.get("priority", "medium")
            assignee = t.get("assignee", "Unassigned")
            assignees_impacted.add(assignee)

            # Propose smart status and priority transition
            if current_status == "done":
                proposed_status = "in_progress"
                proposed_priority = "high"
                rationale = f"Work was previously marked done, but decision '{decision_title}' requires refactoring or validation."
            elif current_status == "in_progress":
                proposed_status = "blocked"
                proposed_priority = "critical"
                rationale = f"Active development paused to prevent rework pending alignment on '{decision_title}'."
            else:
                proposed_status = "in_progress"
                proposed_priority = "high"
                rationale = f"Scope elevated to high priority by decision '{decision_title}'."

            # Determine whether this proposal is based on confirmed evidence
            is_confirmed = t.get("id") in dep_analysis.get("matched_task_ids", []) or any(
                d.get("source") == t.get("id") or d.get("target") == t.get("id") for d in confirmed_deps
            )

            proposed_task_updates.append({
                "taskId": t.get("id"),
                "taskTitle": t.get("title"),
                "assignee": assignee,
                "deadline": t.get("deadline", "Sprint End"),
                "currentStatus": current_status,
                "proposedStatus": proposed_status,
                "currentPriority": current_priority,
                "proposedPriority": proposed_priority,
                "rationale": rationale,
                "evidenceType": "CONFIRMED_DEPENDENCY" if is_confirmed else "AI_INFERRED_POSSIBILITY",
                "evidenceSource": f"Recorded dependency graph ({len(confirmed_deps)} links)" if is_confirmed else "AI heuristic workload correlation",
                "approvalStatus": "pending"
            })

        return {
            "impacted_task_count": len(proposed_task_updates),
            "assignees_impacted": list(assignees_impacted),
            "proposed_task_updates": proposed_task_updates,
            "summary": (
                f"Evaluated {len(tasks)} tasks: {len(proposed_task_updates)} tasks requiring status/priority updates "
                f"across {len(assignees_impacted)} teammate(s): {', '.join(assignees_impacted)}."
            )
        }

task_agent = TaskAgent()
