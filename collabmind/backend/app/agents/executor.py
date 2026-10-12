import asyncio
import json
import logging
import re
from typing import AsyncGenerator, Dict, Any, Optional
from app.core.config import settings
from app.agents.prompts import AGENT_PROMPTS

logger = logging.getLogger(__name__)

# Check if google-cloud-aiplatform is available and configured
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False


class AgentExecutor:
    """
    Executes agent prompts using Vertex AI Gemini model with real-time streaming,
    or falls back to an intelligent mock streaming generator when Vertex AI is offline.
    """

    def __init__(self):
        self._initialized = False

    def _ensure_vertex_init(self):
        if not self._initialized and VERTEX_AVAILABLE:
            try:
                vertexai.init(
                    project=settings.GCP_PROJECT_ID,
                    location=settings.VERTEX_AI_LOCATION
                )
                self._initialized = True
                logger.info("Vertex AI successfully initialized.")
            except Exception as e:
                logger.warning(f"Vertex AI initialization failed: {e}. Will use mock streaming engine.")

    async def execute_stream(
        self,
        agent_tag: str,
        user_prompt: str,
        context_messages: Optional[list] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streams generated text response chunk by chunk for the given agent and prompt.
        """
        system_instruction = AGENT_PROMPTS.get(agent_tag, "You are a helpful collaborative AI teammate.")

        self._ensure_vertex_init()

        if self._initialized and VERTEX_AVAILABLE:
            try:
                model = GenerativeModel(
                    model_name=settings.GEMINI_MODEL,
                    system_instruction=[system_instruction]
                )
                
                # Build context
                prompt_text = f"Context: {json.dumps(context_messages or [])}\nUser Request: {user_prompt}"
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt_text,
                    stream=True
                )

                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.error(f"Vertex AI stream error: {e}. Falling back to fallback mock stream.")

        # Fallback generator for development / demo mode
        async for chunk in self._fallback_stream(agent_tag, user_prompt):
            yield chunk

    async def _fallback_stream(self, agent_tag: str, prompt: str) -> AsyncGenerator[str, None]:
        """Generates dynamic realistic responses when GCP credentials are not active."""
        if agent_tag == "@mindmap":
            content = f"""Here is a mind map synthesized from your brainstorming topic: **"{prompt}"**

```mermaid
mindmap
  root((Brainstorm: {prompt[:20]}))
    Core Vision
      Problem Statement
      User Persona
      Value Proposition
    Architecture
      Frontend Next.js
      Backend FastAPI
      Real-Time Sockets
    Features & Roadmap
      AI Multi-Agents
      Live Collaboration
      Export to Slides
    Go-To-Market
      Developer Beta
      Team Workspaces
      Enterprise Cloud
```

You can view this interactive diagram or copy the mermaid markdown from the canvas!"""

        elif agent_tag == "@ppt-maker":
            content = f"""I have synthesized a multi-slide deck for **"{prompt}"**:

```json
{{
  "deckTitle": "Strategic Pitch: {prompt[:30]}",
  "theme": "indigo-violet",
  "slides": [
    {{
      "slideNumber": 1,
      "title": "{prompt[:25]} - Executive Overview",
      "subtitle": "CollabMind Collaborative Strategy",
      "bullets": [
        "Identified market friction in asynchronous team planning",
        "Unified real-time whiteboard, agent chat, and visual workflows",
        "Accelerating concept-to-execution cycle by 4x"
      ],
      "speakerNotes": "Welcome team. Today we explore our collaborative solution designed for rapid ideation."
    }},
    {{
      "slideNumber": 2,
      "title": "Core Architecture & Capabilities",
      "subtitle": "Powered by Next.js & Vertex AI Agents",
      "bullets": [
        "Sub-50ms WebSocket synchronization across participants",
        "Context-aware AI agents (@mindmap, @ppt-maker, @summarizer)",
        "Zero-friction Google Cloud Run autoscaling"
      ],
      "speakerNotes": "Highlight our modern microservices layout and seamless real-time sockets."
    }},
    {{
      "slideNumber": 3,
      "title": "Action Plan & Milestone Roadmap",
      "subtitle": "Next steps for immediate delivery",
      "bullets": [
        "Finalize interactive slide and mindmap export pipeline",
        "Deploy Firestore security rules and composite queries",
        "Open developer beta test with early adopters"
      ],
      "speakerNotes": "Close with immediate priorities and team deliverables."
    }}
  ]
}}
```

The presentation preview is ready in your slide drawer on the right!"""

        elif agent_tag == "@summarizer":
            content = f"""### 📌 Executive Summary
The discussion focused on: **"{prompt}"**. The team aligned on accelerating deliverables with real-time AI agent assistance and visual tooling.

### 🔑 Key Decisions Made
- Agreed to integrate multi-agent routing for specialized outputs (`@mindmap`, `@ppt-maker`, `@coder`).
- Standardized on FastAPI with ASGI Socket.io for bi-directional live communication.
- Deployed Firebase Auth for multi-tenant identity verification.

### 🎯 Action Items & Next Steps
- [ ] Connect Vertex AI production service account to Cloud Run environment.
- [ ] Test real-time visual canvas rendering under concurrent user load.
- [ ] Prepare slide export to PDF / PPTX for client presentations.

### 💡 Unresolved Questions & Ideas to Explore
- Should we add voice-to-text live transcription in the chat room?
"""

        elif agent_tag == "@coder":
            content = f"""### 🛠️ Architecture Blueprint for: "{prompt}"

```typescript
// Proposed Socket Event Handlers for Agent Streaming
export interface AgentStreamPayload {{
  roomId: string;
  agentTag: '@mindmap' | '@ppt-maker' | '@summarizer' | '@coder';
  chunk: string;
  isFinished: boolean;
  timestamp: number;
}}

export const subscribeToAgentStream = (
  socket: Socket, 
  callback: (payload: AgentStreamPayload) => void
) => {{
  socket.on('agent_stream', callback);
  return () => {{
    socket.off('agent_stream', callback);
  }};
}};
```

This ensures clean separation between chat state and high-frequency streaming events."""

        else:
            content = f"I received your request: '{prompt}'. Let me know how I can help your team collaborate!"

        # Stream words with slight delay for realistic typing experience
        words = re.split(r'(\s+)', content)
        for chunk in words:
            if chunk:
                yield chunk
                await asyncio.sleep(0.015)


agent_executor = AgentExecutor()
