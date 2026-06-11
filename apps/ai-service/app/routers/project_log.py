from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EvaluateLogRequest(BaseModel):
    log_id: str
    body: str
    artifact_url: str | None = None
    entry_type: str = "progress"


@router.post("/evaluate")
async def evaluate_project_log(req: EvaluateLogRequest):
    """Evaluate a project log entry for specificity and return follow-up questions."""
    # TODO: OCR artifact if image, then Claude evaluation
    return {
        "is_specific": True,
        "follow_up_questions": [],
        "resilience_bonus_eligible": False,
    }
