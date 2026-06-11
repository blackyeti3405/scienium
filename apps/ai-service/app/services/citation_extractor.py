import json
from app.services.claude_client import complete

SYSTEM_PROMPT = """You are a citation extraction assistant. Given the reference section of an
academic paper, extract all citations as a JSON array. Each element must have:
- title (string)
- authors (array of strings)
- year (integer or null)
Return ONLY valid JSON, no commentary."""


def extract_citations(references_text: str) -> list[dict]:
    """Extract structured references from the references section of a paper."""
    result = complete(
        prompt=f"Extract all citations from this reference section:\n\n{references_text}",
        system=SYSTEM_PROMPT,
        max_tokens=4096,
    )
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return []
