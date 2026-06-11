from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EvaluateFailureLogRequest(BaseModel):
    log_id: str
    prediction: str
    actual_result: str
    hypothesis: str
    next_steps: str
    artifact_url: str | None = None


@router.post("/evaluate")
async def evaluate_failure_log(req: EvaluateFailureLogRequest):
    """Evaluate a failure log entry and return follow-up questions if too generic."""
    # TODO: Claude evaluation for scientific rigor
    return {
        "is_specific": True,
        "follow_up_questions": [],
    }
