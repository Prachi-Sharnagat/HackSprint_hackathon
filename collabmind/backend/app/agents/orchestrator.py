import asyncio
import json
import logging
import time
from typing import Dict, Any, List

from app.agents.impact_agent import impact_agent
from app.agents.dependency_agent import dependency_agent
from app.agents.task_agent import task_agent
from app.agents.doc_agent import doc_agent

logger = logging.getLogger(__name__)

class MultiAgentOrchestrator:
    """
    CollabMind Multi-Agent Orchestrator
    Coordinates 4 specialized agents concurrently via asyncio.gather(), combines results,
    verifies evidence against the persistent database, and strictly classifies every finding
    into CONFIRMED_DEPENDENCY vs AI_INFERRED_POSSIBILITY.
    """

    async def analyze_decision(
        self,
        decision_title: str,
        decision_description: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"Initiating multi-agent analysis for decision: '{decision_title}'")

        # Step 1: Run Dependency Agent & Impact Agent concurrently
        impact_task = impact_agent.analyze(decision_title, decision_description, context)
        dep_task = dependency_agent.analyze(decision_title, decision_description, context)

        impact_res, dep_res = await asyncio.gather(impact_task, dep_task)

        # Step 2: Run Task Agent & Documentation Agent concurrently, fed with dependency findings
        task_task = task_agent.analyze(decision_title, decision_description, context, dep_res)
        doc_task = doc_agent.analyze(decision_title, decision_description, context, dep_res)

        task_res, doc_res = await asyncio.gather(task_task, doc_task)

        elapsed = round(time.time() - start_time, 2)

        # Step 3: Orchestrator Consolidation & Evidence Verification
        findings = []

        # Convert confirmed graph dependencies into findings
        for dep in dep_res.get("confirmed_dependencies", []):
            findings.append({
                "id": f"find-dep-{dep.get('source')}-{dep.get('target')}",
                "category": "Graph Dependency",
                "item_name": f"{dep.get('source')} ➔ {dep.get('target')}",
                "finding_type": "CONFIRMED_DEPENDENCY",
                "evidence": f"Recorded in SQLite dependency matrix (ID: {dep.get('dependency_id')}). Note: {dep.get('evidence_note')}",
                "confidence": 1.0,
                "action_recommended": f"Verify interface contract for relation '{dep.get('relation_type')}' before committing change."
            })

        # Convert task proposals into findings
        for t_prop in task_res.get("proposed_task_updates", []):
            is_conf = t_prop.get("evidenceType") == "CONFIRMED_DEPENDENCY"
            findings.append({
                "id": f"find-task-{t_prop.get('taskId')}",
                "category": "Task Schedule & Workload",
                "item_name": f"{t_prop.get('taskId')}: {t_prop.get('taskTitle')}",
                "finding_type": "CONFIRMED_DEPENDENCY" if is_conf else "AI_INFERRED_POSSIBILITY",
                "evidence": t_prop.get("evidenceSource"),
                "confidence": 0.95 if is_conf else 0.75,
                "action_recommended": f"Change status from '{t_prop.get('currentStatus')}' to '{t_prop.get('proposedStatus')}' (Priority: {t_prop.get('proposedPriority')}). Assignee: {t_prop.get('assignee')}."
            })

        # Convert doc proposals into findings
        for d_prop in doc_res.get("doc_recommendations", []):
            is_conf = d_prop.get("evidenceType") == "CONFIRMED_DEPENDENCY"
            findings.append({
                "id": f"find-doc-{d_prop.get('docId')}",
                "category": "Project Documentation",
                "item_name": f"{d_prop.get('docId')}: {d_prop.get('title')} ({d_prop.get('docType')})",
                "finding_type": "CONFIRMED_DEPENDENCY" if is_conf else "AI_INFERRED_POSSIBILITY",
                "evidence": d_prop.get("evidenceSource"),
                "confidence": 0.90 if is_conf else 0.65,
                "action_recommended": d_prop.get("recommendedAction")
            })

        # Architectural risk findings
        for idx, risk_text in enumerate(impact_res.get("architectural_risks", [])):
            findings.append({
                "id": f"find-arch-risk-{idx}",
                "category": "System Architecture",
                "item_name": f"Architectural Risk #{idx+1}",
                "finding_type": "AI_INFERRED_POSSIBILITY",
                "evidence": "Inferred from system blast radius and technology stack analysis.",
                "confidence": 0.80,
                "action_recommended": risk_text
            })

        confirmed_count = sum(1 for f in findings if f["finding_type"] == "CONFIRMED_DEPENDENCY")
        inferred_count = sum(1 for f in findings if f["finding_type"] == "AI_INFERRED_POSSIBILITY")

        # Compile actionable proposed updates requiring teammate human approval
        proposed_updates = []

        for t in task_res.get("proposed_task_updates", []):
            proposed_updates.append({
                "id": f"prop-task-{t.get('taskId')}",
                "type": "task_update",
                "targetId": t.get("taskId"),
                "targetTitle": t.get("taskTitle"),
                "field": "status_priority",
                "currentValue": f"Status: {t.get('currentStatus')}, Priority: {t.get('currentPriority')}",
                "proposedValue": f"Status: {t.get('proposedStatus')}, Priority: {t.get('proposedPriority')}",
                "proposedStatus": t.get("proposedStatus"),
                "proposedPriority": t.get("proposedPriority"),
                "rationale": t.get("rationale"),
                "assignee": t.get("assignee"),
                "evidenceType": t.get("evidenceType"),
                "evidenceSource": t.get("evidenceSource"),
                "approvalStatus": "pending",
                "approvedBy": None
            })

        for d in doc_res.get("doc_recommendations", []):
            proposed_updates.append({
                "id": f"prop-doc-{d.get('docId')}",
                "type": "doc_update",
                "targetId": d.get("docId"),
                "targetTitle": d.get("title"),
                "field": "revision_flag",
                "currentValue": "Current",
                "proposedValue": "Needs Revision",
                "rationale": d.get("rationale"),
                "recommendedAction": d.get("recommendedAction"),
                "evidenceType": d.get("evidenceType"),
                "evidenceSource": d.get("evidenceSource"),
                "approvalStatus": "pending",
                "approvedBy": None
            })

        consolidated_report = {
            "summary": (
                f"Multi-Agent AI synthesis complete ({elapsed}s). "
                f"Assessed blast radius: {impact_res.get('blast_radius').upper()}. "
                f"Identified {confirmed_count} confirmed dependencies with verifiable evidence, "
                f"and {inferred_count} AI-inferred possibilities requiring review."
            ),
            "blast_radius_score": impact_res.get("blast_radius", "medium"),
            "elapsed_seconds": elapsed,
            "confirmed_count": confirmed_count,
            "inferred_count": inferred_count,
            "affected_subsystems": impact_res.get("affected_subsystems", []),
            "agent_contributions": {
                "impact_agent": impact_res.get("summary"),
                "dependency_agent": dep_res.get("summary"),
                "task_agent": task_res.get("summary"),
                "doc_agent": doc_res.get("summary")
            },
            "findings": findings
        }

        return {
            "impact_report": consolidated_report,
            "proposed_updates": proposed_updates
        }

orchestrator = MultiAgentOrchestrator()
