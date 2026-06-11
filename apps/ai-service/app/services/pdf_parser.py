import pdfplumber
import pypdf
from pathlib import Path


def extract_text(path: str | Path) -> str:
    """Extract full text from PDF using pdfplumber."""
    text_parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts)


def extract_metadata(path: str | Path) -> dict:
    """Extract author, title, year from PDF metadata."""
    reader = pypdf.PdfReader(str(path))
    meta = reader.metadata or {}
    return {
        "title": meta.get("/Title", ""),
        "author": meta.get("/Author", ""),
        "creation_date": meta.get("/CreationDate", ""),
    }
