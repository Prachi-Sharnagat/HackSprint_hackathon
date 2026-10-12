import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class DependencyAgent:
    """
    Specialized AI Agent 2: Dependency Agent
    Role: Traces explicitly recorded dependencies in the project graph, matches items to verifiable evidence,
    and isolates direct vs indirect upstream/downstream relationships.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    async def analyze(self, decision_title: str, decision_description: str, context: Dict[str, Any]) -> Dict[str, Any]:
        tasks = context.get("tasks", [])
        docs = context.get("documents", [])
        deps = context.get("dependencies", [])

        # Find directly referenced or keyword-matching tasks
        keywords = [w.lower() for w in f"{decision_title} {decision_description}".split() if len(w) > 3]

        matched_task_ids = set()
        matched_doc_ids = set()

        for t in tasks:
            t_content = f"{t.get('title', '')} {t.get('description', '')} {' '.join(t.get('tags', []))}".lower()
            if any(k in t_content for k in keywords):
                matched_task_ids.add(t.get("id"))

        for d in docs:
            d_content = f"{d.get('title', '')} {d.get('summary', '')} {d.get('doc_type', '')}".lower()
            if any(k in d_content for k in keywords):
                matched_doc_ids.add(d.get("id"))

        # Trace recorded dependencies in graph
        confirmed_dependencies = []
        inferred_dependencies = []

        for dep in deps:
            src = dep.get("source_item")
            tgt = dep.get("target_item")
            rel = dep.get("relation_type")
            note = dep.get("evidence_note", "")

            # If either endpoint matches our decision scope
            if src in matched_task_ids or tgt in matched_task_ids or src in matched_doc_ids or tgt in matched_doc_ids:
                confirmed_dependencies.append({
                    "dependency_id": dep.get("id"),
                    "source": src,
                    "target": tgt,
                    "relation_type": rel,
                    "evidence_note": note,
                    "is_confirmed": True
                })

        # If no explicit recorded dependencies match, check if related tasks share assignees or tags
        for t in tasks:
            if t.get("id") in matched_task_ids:
                # Check for other tasks with same tags or assignees
                for other in tasks:
                    if other.get("id") != t.get("id") and other.get("id") not in matched_task_ids:
                        common_tags = set(t.get("tags", [])) & set(other.get("tags", []))
                        if common_tags:
                            inferred_dependencies.append({
                                "source": t.get("id"),
                                "target": other.get("id"),
                                "relation_type": "shares_domain",
                                "evidence_note": f"Inferred correlation: both tasks tag {list(common_tags)}.",
                                "is_confirmed": False
                            })

        return {
            "confirmed_count": len(confirmed_dependencies),
            "inferred_count": len(inferred_dependencies),
            "confirmed_dependencies": confirmed_dependencies,
            "inferred_dependencies": inferred_dependencies[:3],
            "matched_task_ids": list(matched_task_ids),
            "matched_doc_ids": list(matched_doc_ids),
            "summary": (
                f"Identified {len(confirmed_dependencies)} confirmed graph dependencies with verified evidence "
                f"and {len(inferred_dependencies[:3])} inferred domain correlations."
            )
        }

dependency_agent = DependencyAgent()
