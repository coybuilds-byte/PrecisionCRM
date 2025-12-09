import os
import logging
from typing import Tuple, Optional, Any, Dict
import httpx

logger = logging.getLogger(__name__)

# Default Affinda endpoint placeholder. Replace if your account uses a
# different endpoint. You can also set `AFFINDA_API_URL` in the environment.
DEFAULT_AFFINDA_URL = os.getenv("AFFINDA_API_URL", "https://api.affinda.com/v1/resumes")


async def parse_with_affinda(file_bytes: bytes, filename: str = "resume", api_key: Optional[str] = None) -> Tuple[Dict[str, Any], Optional[str]]:
    """Send resume bytes to Affinda resume parser and return the raw JSON plus any textual transcript.

    Returns (response_json, extracted_text_or_None).

    Notes:
    - This function expects an Affinda-style API that accepts a multipart `file` upload
      and returns JSON. The exact field names returned by Affinda vary by plan/version,
      so we attempt to find a reasonable `text` field and otherwise return the full JSON.
    - Provide `api_key` or set `AFFINDA_API_KEY` in the environment.
    """
    if api_key is None:
        api_key = os.getenv("AFFINDA_API_KEY")

    if not api_key:
        raise ValueError("Affinda API key not provided. Set AFFINDA_API_KEY environment variable.")

    url = DEFAULT_AFFINDA_URL

    headers = {"Authorization": f"Bearer {api_key}"}

    # Use httpx AsyncClient for async support
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"file": (filename, file_bytes, "application/octet-stream")}
        resp = await client.post(url, headers=headers, files=files)
        resp.raise_for_status()
        data = resp.json()

    # Try to find a textual transcript in common places
    extracted_text = None
    if isinstance(data, dict):
        # Common patterns: top-level 'text' or nested under 'data'/'parsed'
        extracted_text = data.get("text") or data.get("parsed_text") or data.get("raw_text")
        if not extracted_text and isinstance(data.get("data"), dict):
            extracted_text = data["data"].get("text") or data["data"].get("raw_text")

    return data, extracted_text
