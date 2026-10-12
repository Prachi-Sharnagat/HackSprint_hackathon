import re
from typing import List, Optional, Tuple

SUPPORTED_AGENTS = {
    "@mindmap": "Mind Map Generator",
    "@ppt-maker": "Slide Deck Creator",
    "@summarizer": "Chat & Meeting Summarizer",
    "@coder": "Code Architecture Assistant"
}


class AgentRouter:
    """
    Parses chat messages to detect mentions like @mindmap or @ppt-maker,
    extracts the prompt, and coordinates execution.
    """

    @staticmethod
    def extract_mentions(message_text: str) -> List[str]:
        """Finds all supported agent tags mentioned in the text."""
        mentions = []
        for tag in SUPPORTED_AGENTS.keys():
            if re.search(rf"\b{re.escape(tag)}\b", message_text, re.IGNORECASE):
                mentions.append(tag)
        return mentions

    @staticmethod
    def parse_command(message_text: str) -> Tuple[Optional[str], str]:
        """
        Extracts the primary agent tag and strips it from the user prompt.
        Returns (agent_tag, clean_prompt).
        """
        for tag in SUPPORTED_AGENTS.keys():
            pattern = re.compile(rf"{re.escape(tag)}", re.IGNORECASE)
            if pattern.search(message_text):
                clean_prompt = pattern.sub("", message_text).strip()
                return tag.lower(), clean_prompt

        return None, message_text


agent_router = AgentRouter()
