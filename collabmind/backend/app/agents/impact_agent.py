import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ImpactAgent:
    """
    Specialized AI Agent 1: Impact Agent
    Role: Evaluates the system-wide blast radius across architecture, APIs, data stores, and services.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    async def analyze(self, decision_title: str, decision_description: str, context: Dict[str, Any]) -> Dict[str, Any]:
        tasks = context.get("tasks", [])
        docs = context.get("documents", [])
        deps = context.get("dependencies", [])

        # Check if Gemini API is available
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=(
                        "You are the CollabMind System Impact Agent. Your role is strictly to assess the architectural blast radius "
                        "of a project decision. You determine affected subsystems, infrastructure components, and potential failure modes. "
                        "Respond ONLY in valid JSON with keys: blast_radius ('low'|'medium'|'high'|'critical'), affected_subsystems (list), "
                        "architectural_risks (list of strings), and summary (string)."
                    )
                )
                prompt = (
                    f"Decision: {decision_title}\n"
                    f"Details: {decision_description}\n"
                    f"Subsystems Context: {len(tasks)} tasks, {len(docs)} documents, {len(deps)} recorded dependencies."
                )
                resp = await model.generate_content_async(prompt)
                text = resp.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                return json.loads(text)
            except Exception as e:
                logger.warning(f"ImpactAgent Gemini call failed: {e}. Using specialized heuristic analyzer.")

        # Heuristic Analysis
        subsystems = []
        risks = []
        text = f"{decision_title} {decision_description}".lower()

        if any(w in text for w in ["database", "postgres", "sql", "firebase", "firestore", "storage"]):
            subsystems.extend(["Data Persistence Layer", "Query & Migration Engine", "Data Access Layer"])
            risks.append("Data migration parity between document schema and relational tables.")
            risks.append("Potential connection pool saturation or transaction deadlock under concurrent write loads.")
        if any(w in text for w in ["auth", "login", "jwt", "token", "session"]):
            subsystems.extend(["Authentication Service", "Client Session Management", "API Gateway Middleware"])
            risks.append("Client-side token refresh failure causing unauthorized 401 cascades.")
        if any(w in text for w in ["api", "rest", "graphql", "socket", "endpoint"]):
            subsystems.extend(["API Gateway", "WebSocket Event Transport", "Client SDK Layer"])
            risks.append("Breaking schema changes for mobile/web frontends relying on deprecated contracts.")

        if not subsystems:
            subsystems = ["Application Core Logic", "Shared Workspace State"]
            risks.append("Requires alignment across cross-functional assignees before applying changes.")

        blast = "high" if len(subsystems) >= 3 or "database" in text or "auth" in text else "medium"

        return {
            "blast_radius": blast,
            "affected_subsystems": list(set(subsystems)),
            "architectural_risks": risks,
            "summary": f"Architectural analysis indicates a {blast} blast radius impacting: {', '.join(subsystems[:3])}."
        }

impact_agent = ImpactAgent()
