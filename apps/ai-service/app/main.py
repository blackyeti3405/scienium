from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from app.routers import papers, content, project_log, failure_log, minigames, video
from app.config import settings

app = FastAPI(title="NOVA Lab AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


app.include_router(papers.router, prefix="/papers", tags=["papers"], dependencies=[Depends(verify_api_key)])
app.include_router(content.router, prefix="/content", tags=["content"], dependencies=[Depends(verify_api_key)])
app.include_router(project_log.router, prefix="/project-log", tags=["project-log"], dependencies=[Depends(verify_api_key)])
app.include_router(failure_log.router, prefix="/failure-log", tags=["failure-log"], dependencies=[Depends(verify_api_key)])
app.include_router(minigames.router, prefix="/minigames", tags=["minigames"], dependencies=[Depends(verify_api_key)])
app.include_router(video.router, prefix="/video", tags=["video"], dependencies=[Depends(verify_api_key)])


@app.get("/health")
def health():
    return {"status": "ok"}
