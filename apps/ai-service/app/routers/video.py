from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class TranscodeRequest(BaseModel):
    input_url: str
    output_key: str


@router.post("/transcode")
async def transcode_video(req: TranscodeRequest):
    """Transcode a Showcase video to normalized H.264 MP4."""
    # TODO: download from R2, ffmpeg transcode, upload normalized + thumbnail
    return {"status": "queued", "output_key": req.output_key}


@router.post("/thumbnail")
async def generate_thumbnail(input_url: str, output_key: str):
    """Extract a thumbnail frame from a video."""
    return {"status": "queued", "thumbnail_key": output_key}
