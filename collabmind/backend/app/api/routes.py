import time
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from app.core.firebase import verify_firebase_token
from app.sockets.room_mgr import room_manager
from app.agents.decision_agent import decision_agent

router = APIRouter()

# In-memory stores for fast real-time synchronization
# maps room_id -> list of tasks
ROOM_TASKS: Dict[str, List[Dict[str, Any]]] = {}
# maps room_id -> list of decisions
ROOM_DECISIONS: Dict[str, List[Dict[str, Any]]] = {}


def get_default_tasks(room_id: str) -> List[Dict[str, Any]]:
    """Generates initial starter tasks for a new room."""
    return [
        {
            "id": f"task-1-{room_id[:4]}",
            "roomId": room_id,
            "title": "Setup Firebase Auth & Firestore rules",
            "description": "Configure token validation and security rules for rooms, messages, decisions, and tasks.",
            "status": "done",
            "priority": "high",
            "assignee": "Alex",
            "tags": ["backend", "security", "firebase"],
            "dependencies": [],
            "createdAt": int(time.time() * 1000) - 3600000,
            "updatedAt": int(time.time() * 1000)
        },
        {
            "id": f"task-2-{room_id[:4]}",
            "roomId": room_id,
            "title": "Implement Gemini Function Calling Agent",
            "description": "Define tools analyze_impact, get_related_tasks, and propose_task_updates.",
            "status": "in_progress",
            "priority": "critical",
            "assignee": "Sarah",
            "tags": ["ai", "vertex-ai", "gemini"],
            "dependencies": [f"task-1-{room_id[:4]}"],
            "createdAt": int(time.time() * 1000) - 1800000,
            "updatedAt": int(time.time() * 1000)
        },
        {
            "id": f"task-3-{room_id[:4]}",
            "roomId": room_id,
            "title": "Build Decision-Impact Panel & Approval UI",
            "description": "Create side-by-side proposed changes view with 1-click accept/reject action buttons.",
            "status": "todo",
            "priority": "high",
            "assignee": "David",
            "tags": ["frontend", "react", "ux"],
            "dependencies": [f"task-2-{room_id[:4]}"],
            "createdAt": int(time.time() * 1000) - 900000,
            "updatedAt": int(time.time() * 1000)
        },
        {
            "id": f"task-4-{room_id[:4]}",
            "roomId": room_id,
            "title": "Cloud Run Production Deployment",
            "description": "Package FastAPI container with Dockerfile and configure port 8080 environment variables.",
            "status": "todo",
            "priority": "medium",
            "assignee": "Alex",
            "tags": ["devops", "cloud-run"],
            "dependencies": [],
            "createdAt": int(time.time() * 1000) - 600000,
            "updatedAt": int(time.time() * 1000)
        }
    ]


# Pydantic Request Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    assignee: Optional[str] = "Unassigned"
    tags: Optional[List[str]] = []
    dependencies: Optional[List[str]] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    tags: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None


class DecisionCreate(BaseModel):
    title: str
    description: str
    createdBy: Optional[str] = "Team Member"


# Auth helper
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        # In development mode, allow guest header
        return {"uid": "dev-guest", "name": "Team Collaborator"}
    token = authorization.replace("Bearer ", "")
    user = verify_firebase_token(token)
    if not user:
        return {"uid": "dev-guest", "name": "Team Collaborator"}
    return user


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CollabMind Backend (FastAPI + Vertex AI + Socket.io)",
        "active_rooms": len(room_manager.rooms)
    }


@router.get("/agents")
async def list_available_agents():
    """Returns the list of supported @agent mentions and their capabilities."""
    return {
        "agents": [
            {
                "tag": "@decision",
                "name": "Decision & Impact Coordinator",
                "description": "Vertex AI Agent Builder coordinator with Gemini function calling (analyze_impact, get_related_tasks, propose_task_updates).",
                "color": "#6366f1"
            },
            {
                "tag": "@mindmap",
                "name": "Mind Map Generator",
                "description": "Generates dynamic Mermaid.js mind maps and node diagrams based on chat ideas.",
                "color": "#818cf8"
            },
            {
                "tag": "@ppt-maker",
                "name": "Slide Deck Creator",
                "description": "Transforms conversational discussions into multi-slide presentations with notes.",
                "color": "#ec4899"
            },
            {
                "tag": "@summarizer",
                "name": "Meeting & Chat Summarizer",
                "description": "Creates structured action items, decisions, and executive summaries from chat logs.",
                "color": "#10b981"
            }
        ]
    }


# ===================== TASK BOARD ENDPOINTS =====================

@router.get("/rooms/{room_id}/tasks")
async def get_room_tasks(room_id: str):
    if room_id not in ROOM_TASKS:
        ROOM_TASKS[room_id] = get_default_tasks(room_id)
    return {"tasks": ROOM_TASKS[room_id]}


@router.post("/rooms/{room_id}/tasks")
async def create_task(room_id: str, task: TaskCreate, user: Dict[str, Any] = Depends(get_current_user)):
    if room_id not in ROOM_TASKS:
        ROOM_TASKS[room_id] = get_default_tasks(room_id)

    new_task = {
        "id": f"task-{str(uuid.uuid4())[:8]}",
        "roomId": room_id,
        "title": task.title,
        "description": task.description or "",
        "status": task.status or "todo",
        "priority": task.priority or "medium",
        "assignee": task.assignee or user.get("name", "Unassigned"),
        "tags": task.tags or [],
        "dependencies": task.dependencies or [],
        "createdAt": int(time.time() * 1000),
        "updatedAt": int(time.time() * 1000)
    }

    ROOM_TASKS[room_id].append(new_task)
    return {"status": "ok", "task": new_task}


@router.patch("/rooms/{room_id}/tasks/{task_id}")
async def update_task(room_id: str, task_id: str, updates: TaskUpdate):
    if room_id not in ROOM_TASKS:
        ROOM_TASKS[room_id] = get_default_tasks(room_id)

    for task in ROOM_TASKS[room_id]:
        if task["id"] == task_id:
            if updates.title is not None:
                task["title"] = updates.title
            if updates.description is not None:
                task["description"] = updates.description
            if updates.status is not None:
                task["status"] = updates.status
            if updates.priority is not None:
                task["priority"] = updates.priority
            if updates.assignee is not None:
                task["assignee"] = updates.assignee
            if updates.tags is not None:
                task["tags"] = updates.tags
            if updates.dependencies is not None:
                task["dependencies"] = updates.dependencies
            task["updatedAt"] = int(time.time() * 1000)
            return {"status": "ok", "task": task}

    raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/rooms/{room_id}/tasks/{task_id}")
async def delete_task(room_id: str, task_id: str):
    if room_id in ROOM_TASKS:
        ROOM_TASKS[room_id] = [t for t in ROOM_TASKS[room_id] if t["id"] != task_id]
    return {"status": "ok"}


# ===================== DECISION IMPACT & APPROVALS =====================

@router.get("/rooms/{room_id}/decisions")
async def get_room_decisions(room_id: str):
    if room_id not in ROOM_DECISIONS:
        # Default seed decision
        ROOM_DECISIONS[room_id] = [
            {
                "id": f"dec-1-{room_id[:4]}",
                "roomId": room_id,
                "title": "Migrate to Vertex AI Gemini Function Calling for Task Coordination",
                "description": "Standardized tool definitions across backend agents to allow automated impact analysis and task updates.",
                "status": "approved",
                "createdBy": "Architecture Lead",
                "createdAt": int(time.time() * 1000) - 7200000,
                "impactAnalysis": {
                    "summary": "Impact across backend agent execution and frontend approval workflows.",
                    "severity": "high",
                    "affectedTaskIds": [f"task-2-{room_id[:4]}", f"task-3-{room_id[:4]}"],
                    "risks": [
                        "Requires Vertex AI quota allocation in GCP project",
                        "UI must support multi-task approval state synchronization"
                    ],
                    "mitigation": "Provide mock fallback engine and real-time Socket.io broadcast of approval actions."
                },
                "proposedTaskUpdates": [
                    {
                        "taskId": f"task-2-{room_id[:4]}",
                        "taskTitle": "Implement Gemini Function Calling Agent",
                        "currentStatus": "in_progress",
                        "proposedStatus": "in_progress",
                        "currentPriority": "high",
                        "proposedPriority": "critical",
                        "rationale": "High priority architectural decision dependent on agent tools.",
                        "approvalStatus": "accepted"
                    }
                ]
            }
        ]
    return {"decisions": ROOM_DECISIONS[room_id]}


@router.post("/rooms/{room_id}/decisions")
async def create_decision(room_id: str, data: DecisionCreate, user: Dict[str, Any] = Depends(get_current_user)):
    if room_id not in ROOM_DECISIONS:
        ROOM_DECISIONS[room_id] = []
    if room_id not in ROOM_TASKS:
        ROOM_TASKS[room_id] = get_default_tasks(room_id)

    # Immediately trigger Vertex AI Decision Agent to analyze impact and propose task updates!
    tasks = ROOM_TASKS.get(room_id, [])
    analysis_result = await decision_agent.analyze_decision_impact(
        decision_title=data.title,
        decision_description=data.description,
        room_tasks=tasks
    )

    decision_id = f"dec-{str(uuid.uuid4())[:8]}"
    new_decision = {
        "id": decision_id,
        "roomId": room_id,
        "title": data.title,
        "description": data.description,
        "status": "proposed",
        "createdBy": data.createdBy or user.get("name", "Team Collaborator"),
        "createdAt": int(time.time() * 1000),
        "impactAnalysis": {
            "summary": analysis_result.get("summary"),
            "severity": analysis_result.get("severity", "medium"),
            "affectedTaskIds": analysis_result.get("affectedTaskIds", []),
            "risks": analysis_result.get("risks", []),
            "mitigation": analysis_result.get("mitigation", "")
        },
        "proposedTaskUpdates": analysis_result.get("proposedTaskUpdates", [])
    }

    ROOM_DECISIONS[room_id].insert(0, new_decision)
    return {"status": "ok", "decision": new_decision}


@router.post("/rooms/{room_id}/decisions/{decision_id}/analyze-impact")
async def trigger_decision_analysis(room_id: str, decision_id: str):
    """Re-runs the Vertex AI Agent Builder function calling analysis for a decision."""
    if room_id not in ROOM_DECISIONS:
        raise HTTPException(status_code=404, detail="Room decisions not found")

    decision = next((d for d in ROOM_DECISIONS[room_id] if d["id"] == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    tasks = ROOM_TASKS.get(room_id, get_default_tasks(room_id))
    analysis_result = await decision_agent.analyze_decision_impact(
        decision_title=decision["title"],
        decision_description=decision["description"],
        room_tasks=tasks
    )

    decision["impactAnalysis"] = {
        "summary": analysis_result.get("summary"),
        "severity": analysis_result.get("severity", "medium"),
        "affectedTaskIds": analysis_result.get("affectedTaskIds", []),
        "risks": analysis_result.get("risks", []),
        "mitigation": analysis_result.get("mitigation", "")
    }
    decision["proposedTaskUpdates"] = analysis_result.get("proposedTaskUpdates", [])

    return {"status": "ok", "decision": decision}


@router.post("/rooms/{room_id}/decisions/{decision_id}/approve-proposal/{task_id}")
async def approve_task_proposal(room_id: str, decision_id: str, task_id: str):
    """
    Validates and executes the AI-proposed task update, applying changes directly
    to the active task and synchronizing state.
    """
    if room_id not in ROOM_DECISIONS:
        raise HTTPException(status_code=404, detail="Decision not found")

    decision = next((d for d in ROOM_DECISIONS[room_id] if d["id"] == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    proposal = next((p for p in decision.get("proposedTaskUpdates", []) if p["taskId"] == task_id), None)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal for this task not found")

    # Mark proposal as accepted
    proposal["approvalStatus"] = "accepted"

    # Apply changes to actual task
    tasks = ROOM_TASKS.get(room_id, [])
    applied_task = None
    for task in tasks:
        if task["id"] == task_id:
            if proposal.get("proposedStatus"):
                task["status"] = proposal["proposedStatus"]
            if proposal.get("proposedPriority"):
                task["priority"] = proposal["proposedPriority"]
            task["updatedAt"] = int(time.time() * 1000)
            applied_task = task
            break

    # If all proposals accepted, mark decision approved
    all_decided = all(p.get("approvalStatus") in ["accepted", "rejected"] for p in decision.get("proposedTaskUpdates", []))
    if all_decided:
        decision["status"] = "approved"

    return {
        "status": "ok",
        "message": f"Task '{task_id}' successfully updated to status '{proposal.get('proposedStatus')}'.",
        "updatedTask": applied_task,
        "decision": decision
    }


@router.post("/rooms/{room_id}/decisions/{decision_id}/reject-proposal/{task_id}")
async def reject_task_proposal(room_id: str, decision_id: str, task_id: str):
    """Rejects the AI proposed task update without modifying the task."""
    if room_id not in ROOM_DECISIONS:
        raise HTTPException(status_code=404, detail="Decision not found")

    decision = next((d for d in ROOM_DECISIONS[room_id] if d["id"] == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    proposal = next((p for p in decision.get("proposedTaskUpdates", []) if p["taskId"] == task_id), None)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal for this task not found")

    proposal["approvalStatus"] = "rejected"
    return {"status": "ok", "decision": decision}
