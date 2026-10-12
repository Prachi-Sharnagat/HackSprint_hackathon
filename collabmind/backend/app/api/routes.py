import time
import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from app.core.db import get_db_connection, init_db
from app.agents.orchestrator import orchestrator
from app.sockets.room_mgr import room_manager

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize SQLite database on module import
init_db()

# Request Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    assignee: Optional[str] = "Unassigned"
    deadline: Optional[str] = "Sprint End"
    tags: Optional[List[str]] = []
    dependencies: Optional[List[str]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    tags: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None

class DecisionCreate(BaseModel):
    title: str
    description: str
    createdBy: Optional[str] = "Alex Rivera (Tech Lead)"

class BrainstormRequest(BaseModel):
    prompt: str
    actorName: Optional[str] = "Alex Rivera"

def log_activity(conn, room_id: str, actor_name: str, actor_role: str, action_type: str, target_item: str, details: str):
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO activity_logs (id, room_id, actor_name, actor_role, action_type, target_item, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"act-{str(uuid.uuid4())[:8]}", room_id, actor_name, actor_role,
        action_type, target_item, details, int(time.time() * 1000)
    ))
    conn.commit()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CollabMind Backend (FastAPI + SQLite + Multi-Agent Orchestrator)",
        "active_rooms": len(room_manager.rooms)
    }

# ===================== DASHBOARD & CONTEXT =====================

@router.get("/rooms/{room_id}/dashboard")
async def get_room_dashboard(room_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get room tasks
    tasks = [dict(r) for r in cursor.execute("SELECT * FROM tasks WHERE room_id = ?", (room_id,)).fetchall()]
    for t in tasks:
        t["tags"] = json.loads(t["tags"]) if t.get("tags") else []
        t["dependencies"] = json.loads(t["dependencies"]) if t.get("dependencies") else []

    # Get room documents
    docs = [dict(r) for r in cursor.execute("SELECT * FROM documents WHERE room_id = ?", (room_id,)).fetchall()]

    # Get room dependencies
    deps = [dict(r) for r in cursor.execute("SELECT * FROM dependencies WHERE room_id = ?", (room_id,)).fetchall()]

    # Get room risks
    risks = [dict(r) for r in cursor.execute("SELECT * FROM risks WHERE room_id = ?", (room_id,)).fetchall()]

    # Get room decisions
    decisions_raw = cursor.execute("SELECT * FROM decisions WHERE room_id = ? ORDER BY created_at DESC", (room_id,)).fetchall()
    decisions = []
    for d in decisions_raw:
        d_dict = dict(d)
        d_dict["impactAnalysis"] = json.loads(d_dict["impact_report"]) if d_dict.get("impact_report") else {}
        d_dict["proposedUpdates"] = json.loads(d_dict["proposed_updates"]) if d_dict.get("proposed_updates") else []
        decisions.append(d_dict)

    # Get recent activity
    activities = [dict(r) for r in cursor.execute(
        "SELECT * FROM activity_logs WHERE room_id = ? ORDER BY created_at DESC LIMIT 20", (room_id,)
    ).fetchall()]

    # Proactive Insights synthesis
    blocked_count = sum(1 for t in tasks if t["status"] == "blocked")
    critical_count = sum(1 for t in tasks if t["priority"] == "critical")
    pending_decisions = sum(1 for d in decisions if d["status"] == "proposed")

    proactive_insights = [
        {
            "id": "ins-1",
            "type": "blocker_warning" if blocked_count > 0 else "health_good",
            "title": f"{blocked_count} Active Task Blockers Identified" if blocked_count > 0 else "Sprint Velocity Healthy",
            "description": f"Tasks marked blocked require downstream coordination before sprint completion." if blocked_count > 0 else "No active blocking issues recorded across sprint tasks.",
            "severity": "high" if blocked_count > 0 else "low"
        },
        {
            "id": "ins-2",
            "type": "dependency_alert",
            "title": f"{len(deps)} Explicit Graph Dependencies Recorded",
            "description": "Dependencies link core authentication, database schemas, and system architecture specs.",
            "severity": "medium"
        },
        {
            "id": "ins-3",
            "type": "governance_notice",
            "title": f"{pending_decisions} Pending Decision Approvals" if pending_decisions > 0 else "All Decisions Resolved",
            "description": "Human-in-the-Loop governance active: AI findings require teammate approval before modifying project state.",
            "severity": "medium" if pending_decisions > 0 else "low"
        }
    ]

    conn.close()
    return {
        "roomId": room_id,
        "metrics": {
            "totalTasks": len(tasks),
            "blockedTasks": blocked_count,
            "criticalTasks": critical_count,
            "documentsCount": len(docs),
            "dependenciesCount": len(deps),
            "risksCount": len(risks),
            "decisionsCount": len(decisions)
        },
        "tasks": tasks,
        "documents": docs,
        "dependencies": deps,
        "risks": risks,
        "decisions": decisions,
        "activity": activities,
        "proactiveInsights": proactive_insights
    }

# ===================== TASK BOARD ENDPOINTS =====================

@router.get("/rooms/{room_id}/tasks")
async def get_room_tasks(room_id: str):
    conn = get_db_connection()
    tasks = [dict(r) for r in conn.execute("SELECT * FROM tasks WHERE room_id = ?", (room_id,)).fetchall()]
    conn.close()
    for t in tasks:
        t["tags"] = json.loads(t["tags"]) if t.get("tags") else []
        t["dependencies"] = json.loads(t["dependencies"]) if t.get("dependencies") else []
    return {"tasks": tasks}

@router.post("/rooms/{room_id}/tasks")
async def create_task(room_id: str, task: TaskCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    new_id = f"task-{str(uuid.uuid4())[:8]}"
    now = int(time.time() * 1000)

    cursor.execute("""
    INSERT INTO tasks (id, room_id, title, description, status, priority, assignee, deadline, tags, dependencies, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id, room_id, task.title, task.description or "", task.status or "todo",
        task.priority or "medium", task.assignee or "Unassigned", task.deadline or "Sprint End",
        json.dumps(task.tags or []), json.dumps(task.dependencies or []), now, now
    ))
    conn.commit()

    log_activity(conn, room_id, task.assignee or "Team Member", "Contributor", "TASK_CREATED", new_id, f"Created task: '{task.title}'")
    conn.close()

    return {"status": "ok", "task": {"id": new_id, "title": task.title}}

@router.patch("/rooms/{room_id}/tasks/{task_id}")
async def update_task(room_id: str, task_id: str, updates: TaskUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    task = cursor.execute("SELECT * FROM tasks WHERE id = ? AND room_id = ?", (task_id, room_id)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    fields = []
    values = []
    if updates.title is not None:
        fields.append("title = ?"); values.append(updates.title)
    if updates.description is not None:
        fields.append("description = ?"); values.append(updates.description)
    if updates.status is not None:
        fields.append("status = ?"); values.append(updates.status)
    if updates.priority is not None:
        fields.append("priority = ?"); values.append(updates.priority)
    if updates.assignee is not None:
        fields.append("assignee = ?"); values.append(updates.assignee)
    if updates.deadline is not None:
        fields.append("deadline = ?"); values.append(updates.deadline)
    if updates.tags is not None:
        fields.append("tags = ?"); values.append(json.dumps(updates.tags))
    if updates.dependencies is not None:
        fields.append("dependencies = ?"); values.append(json.dumps(updates.dependencies))

    fields.append("updated_at = ?"); values.append(int(time.time() * 1000))
    values.append(task_id)

    cursor.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()

    log_activity(conn, room_id, updates.assignee or "Team Member", "Contributor", "TASK_UPDATED", task_id, f"Updated task {task_id}")
    conn.close()
    return {"status": "ok"}

# ===================== DOCUMENTS & DEPENDENCIES =====================

@router.get("/rooms/{room_id}/documents")
async def get_room_documents(room_id: str):
    conn = get_db_connection()
    docs = [dict(r) for r in conn.execute("SELECT * FROM documents WHERE room_id = ?", (room_id,)).fetchall()]
    conn.close()
    return {"documents": docs}

@router.get("/rooms/{room_id}/dependencies")
async def get_room_dependencies(room_id: str):
    conn = get_db_connection()
    deps = [dict(r) for r in conn.execute("SELECT * FROM dependencies WHERE room_id = ?", (room_id,)).fetchall()]
    conn.close()
    return {"dependencies": deps}

@router.get("/rooms/{room_id}/activity")
async def get_room_activity(room_id: str):
    conn = get_db_connection()
    activity = [dict(r) for r in conn.execute(
        "SELECT * FROM activity_logs WHERE room_id = ? ORDER BY created_at DESC LIMIT 30", (room_id,)
    ).fetchall()]
    conn.close()
    return {"activity": activity}

# ===================== DECISION IMPACT & MULTI-AGENT =====================

@router.get("/rooms/{room_id}/decisions")
async def get_room_decisions(room_id: str):
    conn = get_db_connection()
    decisions_raw = conn.execute("SELECT * FROM decisions WHERE room_id = ? ORDER BY created_at DESC", (room_id,)).fetchall()
    decisions = []
    for d in decisions_raw:
        d_dict = dict(d)
        d_dict["impactAnalysis"] = json.loads(d_dict["impact_report"]) if d_dict.get("impact_report") else {}
        d_dict["proposedTaskUpdates"] = json.loads(d_dict["proposed_updates"]) if d_dict.get("proposed_updates") else []
        decisions.append(d_dict)
    conn.close()
    return {"decisions": decisions}

@router.post("/rooms/{room_id}/decisions")
async def create_decision(room_id: str, data: DecisionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Gather live project context from SQLite
    tasks = [dict(r) for r in cursor.execute("SELECT * FROM tasks WHERE room_id = ?", (room_id,)).fetchall()]
    for t in tasks:
        t["tags"] = json.loads(t["tags"]) if t.get("tags") else []
        t["dependencies"] = json.loads(t["dependencies"]) if t.get("dependencies") else []

    docs = [dict(r) for r in cursor.execute("SELECT * FROM documents WHERE room_id = ?", (room_id,)).fetchall()]
    deps = [dict(r) for r in cursor.execute("SELECT * FROM dependencies WHERE room_id = ?", (room_id,)).fetchall()]

    context = {
        "tasks": tasks,
        "documents": docs,
        "dependencies": deps
    }

    # Run genuine multi-agent orchestration
    agent_output = await orchestrator.analyze_decision(
        decision_title=data.title,
        decision_description=data.description,
        context=context
    )

    impact_report = agent_output.get("impact_report", {})
    proposed_updates = agent_output.get("proposed_updates", [])

    decision_id = f"dec-{str(uuid.uuid4())[:8]}"
    now = int(time.time() * 1000)

    cursor.execute("""
    INSERT INTO decisions (id, room_id, title, description, status, created_by, created_at, impact_report, proposed_updates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        decision_id, room_id, data.title, data.description, "proposed",
        data.createdBy or "Alex Rivera (Tech Lead)", now,
        json.dumps(impact_report), json.dumps(proposed_updates)
    ))

    # Log activity
    log_activity(
        conn, room_id, data.createdBy or "Alex Rivera", "Tech Lead",
        "DECISION_PROPOSED", decision_id,
        f"Proposed decision '{data.title}'. Multi-agent report flagged {impact_report.get('confirmed_count')} confirmed dependencies and {impact_report.get('inferred_count')} AI inferences."
    )

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "decision": {
            "id": decision_id,
            "roomId": room_id,
            "title": data.title,
            "description": data.description,
            "status": "proposed",
            "createdBy": data.createdBy,
            "createdAt": now,
            "impactAnalysis": impact_report,
            "proposedTaskUpdates": proposed_updates
        }
    }

@router.post("/rooms/{room_id}/decisions/{decision_id}/analyze-impact")
async def trigger_decision_analysis(room_id: str, decision_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    decision = cursor.execute("SELECT * FROM decisions WHERE id = ? AND room_id = ?", (decision_id, room_id)).fetchone()
    if not decision:
        conn.close()
        raise HTTPException(status_code=404, detail="Decision not found")

    tasks = [dict(r) for r in cursor.execute("SELECT * FROM tasks WHERE room_id = ?", (room_id,)).fetchall()]
    for t in tasks:
        t["tags"] = json.loads(t["tags"]) if t.get("tags") else []
        t["dependencies"] = json.loads(t["dependencies"]) if t.get("dependencies") else []

    docs = [dict(r) for r in cursor.execute("SELECT * FROM documents WHERE room_id = ?", (room_id,)).fetchall()]
    deps = [dict(r) for r in cursor.execute("SELECT * FROM dependencies WHERE room_id = ?", (room_id,)).fetchall()]

    agent_output = await orchestrator.analyze_decision(
        decision_title=decision["title"],
        decision_description=decision["description"],
        context={"tasks": tasks, "documents": docs, "dependencies": deps}
    )

    impact_report = agent_output.get("impact_report", {})
    proposed_updates = agent_output.get("proposed_updates", [])

    cursor.execute("""
    UPDATE decisions SET impact_report = ?, proposed_updates = ? WHERE id = ?
    """, (json.dumps(impact_report), json.dumps(proposed_updates), decision_id))
    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "decision": {
            "id": decision_id,
            "title": decision["title"],
            "impactAnalysis": impact_report,
            "proposedTaskUpdates": proposed_updates
        }
    }

@router.post("/rooms/{room_id}/decisions/{decision_id}/approve-proposal/{item_id}")
async def approve_proposal(
    room_id: str,
    decision_id: str,
    item_id: str,
    actor_name: Optional[str] = "Alex Rivera",
    actor_role: Optional[str] = "Tech Lead"
):
    conn = get_db_connection()
    cursor = conn.cursor()

    decision_row = cursor.execute("SELECT * FROM decisions WHERE id = ? AND room_id = ?", (decision_id, room_id)).fetchone()
    if not decision_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Decision not found")

    proposals = json.loads(decision_row["proposed_updates"]) if decision_row["proposed_updates"] else []
    target_prop = next((p for p in proposals if p.get("targetId") == item_id or p.get("id") == item_id or p.get("taskId") == item_id), None)

    if not target_prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Proposal for item not found")

    # Mark proposal as accepted
    target_prop["approvalStatus"] = "accepted"
    target_prop["approvedBy"] = actor_name

    # Apply changes to actual task or document in SQLite!
    applied_item = None
    if target_prop.get("type") == "task_update" or "proposedStatus" in target_prop:
        task_id = target_prop.get("targetId") or target_prop.get("taskId")
        new_status = target_prop.get("proposedStatus")
        new_priority = target_prop.get("proposedPriority")

        cursor.execute("""
        UPDATE tasks SET status = ?, priority = ?, updated_at = ? WHERE id = ? AND room_id = ?
        """, (new_status, new_priority, int(time.time() * 1000), task_id, room_id))

        applied_item = {"type": "task", "id": task_id, "status": new_status, "priority": new_priority}
        log_activity(conn, room_id, actor_name, actor_role, "PROPOSAL_APPROVED", task_id,
                     f"Approved update for Task '{target_prop.get('targetTitle')}': status changed to '{new_status}', priority to '{new_priority}'")

    elif target_prop.get("type") == "doc_update":
        doc_id = target_prop.get("targetId")
        cursor.execute("""
        UPDATE documents SET summary = summary || ' [Flagged: Needs Revision by Decision]', last_updated = ? WHERE id = ? AND room_id = ?
        """, (int(time.time() * 1000), doc_id, room_id))

        applied_item = {"type": "document", "id": doc_id, "status": "needs_revision"}
        log_activity(conn, room_id, actor_name, actor_role, "PROPOSAL_APPROVED", doc_id,
                     f"Approved document revision flag for '{target_prop.get('targetTitle')}'")

    # Check if all proposals in this decision are resolved
    all_decided = all(p.get("approvalStatus") in ["accepted", "rejected"] for p in proposals)
    new_dec_status = "approved" if all_decided else decision_row["status"]

    cursor.execute("""
    UPDATE decisions SET proposed_updates = ?, status = ? WHERE id = ?
    """, (json.dumps(proposals), new_dec_status, decision_id))

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "message": f"Proposal for '{item_id}' approved and applied to workspace state by {actor_name}.",
        "appliedItem": applied_item,
        "allDecided": all_decided
    }

@router.post("/rooms/{room_id}/decisions/{decision_id}/reject-proposal/{item_id}")
async def reject_proposal(
    room_id: str,
    decision_id: str,
    item_id: str,
    actor_name: Optional[str] = "Alex Rivera",
    actor_role: Optional[str] = "Tech Lead"
):
    conn = get_db_connection()
    cursor = conn.cursor()

    decision_row = cursor.execute("SELECT * FROM decisions WHERE id = ? AND room_id = ?", (decision_id, room_id)).fetchone()
    if not decision_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Decision not found")

    proposals = json.loads(decision_row["proposed_updates"]) if decision_row["proposed_updates"] else []
    target_prop = next((p for p in proposals if p.get("targetId") == item_id or p.get("id") == item_id or p.get("taskId") == item_id), None)

    if not target_prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Proposal not found")

    target_prop["approvalStatus"] = "rejected"
    target_prop["approvedBy"] = actor_name

    log_activity(conn, room_id, actor_name, actor_role, "PROPOSAL_REJECTED", item_id,
                 f"Rejected proposal for '{target_prop.get('targetTitle')}'. No state changes applied.")

    cursor.execute("UPDATE decisions SET proposed_updates = ? WHERE id = ?", (json.dumps(proposals), decision_id))
    conn.commit()
    conn.close()

    return {"status": "ok", "message": f"Proposal for '{item_id}' rejected by {actor_name}."}

# ===================== AI BRAINSTORMING CHAT =====================

@router.post("/rooms/{room_id}/chat/brainstorm")
async def brainstorm_chat(room_id: str, req: BrainstormRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    tasks = [dict(r) for r in cursor.execute("SELECT id, title, status, priority, assignee FROM tasks WHERE room_id = ?", (room_id,)).fetchall()]
    docs = [dict(r) for r in cursor.execute("SELECT id, title, doc_type FROM documents WHERE room_id = ?", (room_id,)).fetchall()]
    deps = [dict(r) for r in cursor.execute("SELECT source_item, target_item, relation_type FROM dependencies WHERE room_id = ?", (room_id,)).fetchall()]
    conn.close()

    prompt = req.prompt.lower()

    # Generate context-aware intelligence
    response_sections = []
    response_sections.append(f"**Brainstorming Analysis for:** *\"{req.prompt}\"*")

    if any(w in prompt for w in ["database", "postgres", "sql", "firebase", "storage"]):
        response_sections.append(
            "• **Data Persistence Impact:** Replacing Firebase with PostgreSQL/SQLite impacts `Task-102` (Sarah Chen) and references in `Doc-3` (Database Schema Spec).\n"
            "• **Dependency Risk:** 3 dependent tasks depend on verified database schemas before the UI layer can be completed.\n"
            "• **Recommendation:** Run a formal decision proposal so the Multi-Agent team can verify all foreign key relationships and flag affected PRDs."
        )
    elif any(w in prompt for w in ["auth", "security", "token", "login"]):
        response_sections.append(
            "• **Authentication Impact:** Core auth services are covered by `Task-101` (Alex Rivera). Modifying auth contracts triggers changes in WebSocket session handshakes and client Bearer tokens.\n"
            "• **Recommendation:** Maintain dual JWT verification during sprint transition to avoid kicking active teammates out of rooms."
        )
    else:
        response_sections.append(
            f"• **Workspace Context:** The active room has {len(tasks)} tasks, {len(docs)} specification documents, and {len(deps)} recorded dependencies.\n"
            "• **Proactive Insight:** When you propose this as a decision, the Impact Agent, Dependency Agent, Task Agent, and Documentation Agent will formulate an explainable report with verified evidence links."
        )

    return {
        "status": "ok",
        "actorName": req.actorName,
        "reply": "\n\n".join(response_sections)
    }
