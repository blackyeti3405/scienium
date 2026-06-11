from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GenerateMiniGameRequest(BaseModel):
    building_id: str
    category: str
    lab_type: str
    difficulty: int


@router.post("/generate")
async def generate_mini_game(req: GenerateMiniGameRequest):
    """Generate mini-game content for a given building and difficulty level."""
    # TODO: pre-baked or Claude-generated scenario based on category + lab_type
    return {
        "category": req.category,
        "building_id": req.building_id,
        "difficulty": req.difficulty,
        "scenario": "Placeholder scenario",
        "correct_answer": "placeholder",
        "explanation": "Placeholder explanation",
    }
