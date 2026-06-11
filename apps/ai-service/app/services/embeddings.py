import voyageai
from app.config import settings

_client: voyageai.Client | None = None


def get_client() -> voyageai.Client:
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=settings.voyage_api_key)
    return _client


def embed_text(text: str) -> list[float]:
    """Compute a voyage-3-lite embedding for a single text."""
    client = get_client()
    result = client.embed([text], model="voyage-3-lite", input_type="document")
    return result.embeddings[0]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Compute embeddings for multiple texts."""
    client = get_client()
    result = client.embed(texts, model="voyage-3-lite", input_type="document")
    return result.embeddings
