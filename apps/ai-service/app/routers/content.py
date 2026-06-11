from fastapi import APIRouter

router = APIRouter()


@router.get("/field-dispatch")
async def get_field_dispatch(lab_type: str):
    """Return today's Field Dispatch content for a lab type."""
    # TODO: query pre-generated content from DB, or generate on the fly
    return {
        "body": f"Placeholder Field Dispatch for {lab_type}",
        "reflection_question": "What did you find most surprising about this?",
        "lab_type": lab_type,
    }


@router.get("/expertise")
async def get_expertise_question(lab_type: str, clearance_level: int):
    """Generate a Proof of Expertise question for the given clearance level."""
    # TODO: call Claude with lab-type context and prior question history
    return {
        "question": f"Placeholder expertise question for {lab_type} at level {clearance_level}",
        "clearance_level": clearance_level,
        "lab_type": lab_type,
    }
