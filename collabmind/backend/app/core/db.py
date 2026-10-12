import sqlite3
import json
import time
import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "collabmind.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite schema and seeds rich sample data if tables are empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        created_at INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        assignee TEXT NOT NULL,
        deadline TEXT,
        tags TEXT,
        dependencies TEXT,
        created_at INTEGER,
        updated_at INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        url_or_path TEXT,
        summary TEXT,
        last_updated INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        source_item TEXT NOT NULL,
        target_item TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        evidence_note TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risks (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        mitigation TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER,
        impact_report TEXT,
        proposed_updates TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_item TEXT NOT NULL,
        details TEXT,
        created_at INTEGER
    )
    """)

    conn.commit()

    # Seed default room if empty
    cursor.execute("SELECT COUNT(*) FROM rooms")
    if cursor.fetchone()[0] == 0:
        seed_default_data(conn)

    conn.close()
    logger.info(f"SQLite database initialized at: {DB_PATH}")

def seed_default_data(conn):
    cursor = conn.cursor()
    now = int(time.time() * 1000)
    room_id = "general"

    cursor.execute(
        "INSERT OR IGNORE INTO rooms (id, name, topic, created_at) VALUES (?, ?, ?, ?)",
        (room_id, "🚀 Hack Sprint 2026", "Building CollabMind Multi-Agent Collaboration", now)
    )

    tasks = [
        ("task-101", room_id, "Configure Firebase Auth & Token Verification",
         "Implement JWT exchange, guest session fallback, and token middleware.", "done", "high",
         "Alex Rivera", "Day 1 - 12:00 PM", json.dumps(["backend", "auth", "firebase"]), json.dumps([]), now - 7200000, now - 3600000),
        ("task-102", room_id, "Implement PostgreSQL Schema & Migration Scripts",
         "Set up core tables: users, workspace_members, decisions, and audit_trail.", "in_progress", "critical",
         "Sarah Chen", "Day 2 - 04:00 PM", json.dumps(["database", "postgres", "sql"]), json.dumps(["task-101"]), now - 5400000, now - 1800000),
        ("task-103", room_id, "Build Multi-Agent Orchestrator & Impact Engine",
         "Coordinate Impact, Dependency, Task, and Doc agents into one consolidated report.", "in_progress", "critical",
         "Elena Rostova", "Day 2 - 06:00 PM", json.dumps(["ai", "agents", "gemini"]), json.dumps(["task-102"]), now - 3600000, now),
        ("task-104", room_id, "Frontend Approval UI & Evidence Badges",
         "Granular accept/reject toggles with Confirmed vs Inferred status indicators.", "todo", "high",
         "David Kumar", "Day 3 - 10:00 AM", json.dumps(["frontend", "react", "ux"]), json.dumps(["task-103"]), now - 1800000, now),
        ("task-105", room_id, "Real-Time WebSocket Sync & Activity Audit Trail",
         "Broadcast decision proposals, approvals, and user actions live to all teammates.", "todo", "medium",
         "Alex Rivera", "Day 3 - 02:00 PM", json.dumps(["realtime", "sockets", "audit"]), json.dumps(["task-104"]), now - 900000, now),
        ("task-106", room_id, "Update Architecture Diagram & PRD v2",
         "Document agent interactions, fallback simulation, and evidence data model.", "todo", "low",
         "David Kumar", "Day 3 - 05:00 PM", json.dumps(["docs", "architecture"]), json.dumps(["task-104"]), now - 500000, now)
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO tasks (id, room_id, title, description, status, priority, assignee, deadline, tags, dependencies, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, tasks)

    documents = [
        ("doc-1", room_id, "Product Requirements Document (PRD v2.1)", "PRD", "docs/PRD_v2.1.md",
         "Defines CollabMind core capabilities: Multi-Agent AI impact reports, human approval, and multi-user workspace.", now - 86400000),
        ("doc-2", room_id, "System Architecture & Data Flow Spec", "Architecture", "docs/architecture.png",
         "Illustrates React SPA client, FastAPI backend, SQLite persistent store, and Gemini multi-agent coordinator.", now - 43200000),
        ("doc-3", room_id, "Database Migration & Schema Guide", "Technical Spec", "docs/db_schema.sql",
         "Outlines transition from Firebase Firestore to relational PostgreSQL / SQLite schemas.", now - 21600000),
        ("doc-4", room_id, "Hackathon Demo Slide Deck", "Presentation", "slides/CollabMind_Pitch.pdf",
         "10-slide pitch explaining the downstream impact problem and CollabMind solution.", now - 10800000)
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO documents (id, room_id, title, doc_type, url_or_path, summary, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, documents)

    dependencies = [
        ("dep-1", room_id, "task-102", "task-101", "depends_on", "PostgreSQL database migrations require verified user identity model from task-101."),
        ("dep-2", room_id, "task-103", "task-102", "depends_on", "Multi-Agent engine requires database models to persist analysis and proposals."),
        ("dep-3", room_id, "task-104", "task-103", "depends_on", "Approval UI displays output produced by Multi-Agent Orchestrator."),
        ("dep-4", room_id, "doc-3", "task-102", "documents", "Database schema guide directly references PostgreSQL tables and migration scripts."),
        ("dep-5", room_id, "doc-2", "task-101", "documents", "Architecture diagram illustrates Firebase Auth token verification flow.")
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO dependencies (id, room_id, source_item, target_item, relation_type, evidence_note)
    VALUES (?, ?, ?, ?, ?, ?)
    """, dependencies)

    risks = [
        ("risk-1", room_id, "Database Migration Breaking Live Clients", "Architecture", "critical", "active",
         "Switching database driver without parallel run could disrupt active workspace sessions."),
        ("risk-2", room_id, "Agent Hallucination Inaccurately Modifying Tasks", "AI Safety", "high", "mitigated",
         "Enforced Human-in-the-Loop gating: no changes applied until explicit teammate approval."),
        ("risk-3", room_id, "API Quota Exceeded During Live Judging", "Infrastructure", "medium", "mitigated",
         "High-fidelity local fallback agent engine handles analysis if Gemini API key or quota is unavailable.")
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO risks (id, room_id, title, category, severity, status, mitigation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, risks)

    # Initial decision
    seed_impact = {
        "summary": "Initial baseline decision establishing multi-agent orchestration for downstream impact analysis.",
        "blast_radius_score": "high",
        "affected_subsystems": ["Backend Agents", "Task Pipeline", "Documentation"],
        "agent_contributions": {
            "impact_agent": "Identified blast radius across backend agent services and frontend approval screen.",
            "dependency_agent": "Verified 3 dependent tasks (task-102, task-103, task-104) and 2 architecture documents.",
            "task_agent": "Flagged potential deadline delays for Sarah Chen and David Kumar.",
            "doc_agent": "Flagged PRD v2.1 and System Architecture diagram needing updates."
        },
        "findings": [
            {
                "id": "find-1",
                "category": "Task Schedule",
                "item_name": "Task-102: Implement PostgreSQL Schema",
                "finding_type": "CONFIRMED_DEPENDENCY",
                "evidence": "Recorded dependency dep-1 links task-102 directly to auth configuration.",
                "confidence": 1.0,
                "action_recommended": "Set priority to Critical and align with Sarah Chen."
            },
            {
                "id": "find-2",
                "category": "Documentation",
                "item_name": "Doc-2: System Architecture Spec",
                "finding_type": "CONFIRMED_DEPENDENCY",
                "evidence": "Document doc-2 explicitly illustrates auth flow that will change.",
                "confidence": 0.95,
                "action_recommended": "Flag for documentation team review."
            },
            {
                "id": "find-3",
                "category": "Cross-Functional",
                "item_name": "API Client Library Backward Compatibility",
                "finding_type": "AI_INFERRED_POSSIBILITY",
                "evidence": "AI inferred: Upstream client mobile apps may experience token format mismatches.",
                "confidence": 0.72,
                "action_recommended": "Verify token serialization in mobile clients before rollout."
            }
        ]
    }

    seed_proposals = [
        {
            "id": "prop-1",
            "type": "task_update",
            "targetId": "task-102",
            "targetTitle": "Implement PostgreSQL Schema & Migration Scripts",
            "field": "priority",
            "currentValue": "high",
            "proposedValue": "critical",
            "rationale": "Database schema is on the critical path for multi-agent persistence.",
            "evidenceType": "CONFIRMED_DEPENDENCY",
            "evidenceSource": "Dependency dep-1 & Task-101",
            "approvalStatus": "accepted",
            "approvedBy": "Alex Rivera"
        },
        {
            "id": "prop-2",
            "type": "doc_update",
            "targetId": "doc-2",
            "targetTitle": "System Architecture & Data Flow Spec",
            "field": "status",
            "currentValue": "current",
            "proposedValue": "needs_revision",
            "rationale": "Architecture diagram must reflect the verified relational storage layer.",
            "evidenceType": "CONFIRMED_DEPENDENCY",
            "evidenceSource": "Dependency dep-5",
            "approvalStatus": "accepted",
            "approvedBy": "Sarah Chen"
        }
    ]

    cursor.execute("""
    INSERT OR IGNORE INTO decisions (id, room_id, title, description, status, created_by, created_at, impact_report, proposed_updates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "dec-seed-1", room_id, "Adopt PostgreSQL & SQLite with Multi-Agent Downstream Verification",
        "Replace unverified cloud-only state with persistent relational storage and multi-agent impact verification.",
        "approved", "Alex Rivera (Tech Lead)", now - 7200000,
        json.dumps(seed_impact), json.dumps(seed_proposals)
    ))

    activity = [
        ("act-1", room_id, "Alex Rivera", "Tech Lead", "DECISION_PROPOSED", "dec-seed-1",
         "Proposed decision: 'Adopt PostgreSQL & SQLite with Multi-Agent Downstream Verification'", now - 7200000),
        ("act-2", room_id, "CollabMind Multi-Agent", "AI System", "ANALYSIS_COMPLETED", "dec-seed-1",
         "Completed multi-agent synthesis: 2 Confirmed Dependencies, 1 AI-Inferred Possibility", now - 7100000),
        ("act-3", room_id, "Alex Rivera", "Tech Lead", "PROPOSAL_APPROVED", "prop-1",
         "Approved priority update for Task-102 to 'critical'", now - 6500000),
        ("act-4", room_id, "Sarah Chen", "Frontend Eng", "PROPOSAL_APPROVED", "prop-2",
         "Approved revision flag for Doc-2 Architecture Spec", now - 5000000)
    ]

    cursor.executemany("""
    INSERT OR IGNORE INTO activity_logs (id, room_id, actor_name, actor_role, action_type, target_item, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, activity)

    conn.commit()
