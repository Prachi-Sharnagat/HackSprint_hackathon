import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class DocumentationAgent:
    """
    Specialized AI Agent 4: Documentation Agent
    Role: Scans project deliverables (PRDs, architecture diagrams, API schemas, slide decks)
    to identify collateral that requires revision or updates when decisions change.
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
        docs = context.get("documents", [])
        matched_doc_ids = set(dep_analysis.get("matched_doc_ids", []))

        # Check document text and types
        keywords = [w.lower() for w in f"{decision_title} {decision_description}".split() if len(w) > 3]

        doc_recommendations = []
        for doc in docs:
            d_id = doc.get("id")
            title = doc.get("title", "")
            doc_type = doc.get("doc_type", "")
            summary = doc.get("summary", "")
            url = doc.get("url_or_path", "")

            combined = f"{title} {doc_type} {summary} {url}".lower()

            is_direct_match = d_id in matched_doc_ids or any(k in combined for k in keywords)

            if is_direct_match or doc_type in ["Architecture", "PRD"]:
                evidence_type = "CONFIRMED_DEPENDENCY" if is_direct_match else "AI_INFERRED_POSSIBILITY"
                action_text = "Update architecture topology and component interfaces." if doc_type == "Architecture" else (
                    "Update core requirements and technology stack specifications." if doc_type == "PRD" else
                    "Review and update slide notes for hackathon pitch deck."
                )

                doc_recommendations.append({
                    "docId": d_id,
                    "title": title,
                    "docType": doc_type,
                    "urlOrPath": url,
                    "recommendedAction": action_text,
                    "rationale": f"Deliverable references subsystem impacted by '{decision_title}'.",
                    "evidenceType": evidence_type,
                    "evidenceSource": f"Explicit match in {doc_type} document registry" if is_direct_match else "AI documentation consistency check",
                    "approvalStatus": "pending"
                })

        return {
            "docs_reviewed_count": len(docs),
            "docs_needing_update_count": len(doc_recommendations),
            "doc_recommendations": doc_recommendations,
            "summary": f"Reviewed {len(docs)} project documents: {len(doc_recommendations)} require documentation updates."
        }

doc_agent = DocumentationAgent()
