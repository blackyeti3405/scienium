from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()


class ProcessPaperRequest(BaseModel):
    paper_id: str
    file_url: str
    team_topic: str
    lab_type: str


@router.post("/process")
async def process_paper(req: ProcessPaperRequest, background_tasks: BackgroundTasks):
    """Enqueue async PDF processing: parse → summarize → quiz → citations → embed."""
    from app.workers.paper_processor import process_paper_job
    background_tasks.add_task(process_paper_job, req.model_dump())
    return {"status": "queued", "paper_id": req.paper_id}


@router.post("/quiz")
async def evaluate_quiz_response(paper_id: str, question: str, response: str):
    """Evaluate a student's quiz response for a paper."""
    # TODO: call Claude to evaluate response quality
    return {"evaluation": "placeholder", "passed": True}


@router.post("/extract-citations")
async def extract_citations(paper_id: str, text: str):
    """Extract structured reference list from paper text using Claude."""
    # TODO: call citation_extractor service
    return {"references": []}
