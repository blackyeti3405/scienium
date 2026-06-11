import structlog

logger = structlog.get_logger()


async def process_paper_job(payload: dict) -> None:
    """
    Full paper processing pipeline:
    1. Download PDF from R2
    2. Extract text + metadata
    3. Chunk text
    4. Generate summary, quiz questions, relevance probe via Claude
    5. Extract citations
    6. Compute embedding
    7. Write results back to DB; update paper status to 'ready'
    """
    paper_id = payload["paper_id"]
    log = logger.bind(paper_id=paper_id)
    log.info("paper_processing_started")

    try:
        # TODO: implement each step
        log.info("paper_processing_complete")
    except Exception as exc:
        log.error("paper_processing_failed", error=str(exc))
        raise
