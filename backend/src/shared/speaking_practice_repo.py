"""
Speaking Practice GitHub Repository.

Fetches speaking practice content from GitHub storage:
- Manifest files (topic listings)
- Content files (practice structure)
- Audio files (MP3 streams)

Base URL structure:
  {BASE_URL}/speaking-practice/{topic_id}/manifest.json
  {BASE_URL}/speaking-practice/{topic_id}/{subtopic_id}/content.json
  {BASE_URL}/speaking-practice/{topic_id}/{subtopic_id}/audio/*.mp3
"""

from __future__ import annotations

import requests
from typing import Any

from src.extensions import logger


class SpeakingPracticeRepository:
    """Fetch speaking practice content from GitHub."""

    def __init__(
        self,
        *,
        base_url: str,
        timeout: float = 10.0,
    ) -> None:
        if not base_url:
            raise ValueError("base_url must be provided")

        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _fetch_json(self, path: str) -> dict[str, Any]:
        """Fetch and parse JSON file from GitHub."""
        url = f"{self.base_url}/{path}"
        logger.info(f"[SPEAKING-PRACTICE] Fetching JSON from {url}")
        
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        
        try:
            return resp.json()
        except ValueError as e:
            body_preview = resp.text[:200].replace("\n", "\\n")
            logger.error(
                f"[SPEAKING-PRACTICE] Failed to parse JSON from {url}: {e} "
                f"| body_preview={body_preview!r}"
            )
            raise ValueError(f"Failed to parse JSON at {url}: {e}") from e

    def _fetch_bytes(self, path: str) -> bytes:
        """Fetch raw file bytes from GitHub."""
        url = f"{self.base_url}/{path}"
        logger.info(f"[SPEAKING-PRACTICE] Fetching file from {url}")
        
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.content

    def get_manifest(self, topic_id: str) -> dict[str, Any]:
        """Get manifest.json for a specific topic."""
        path = f"speaking-practice/{topic_id}/manifest.json"
        return self._fetch_json(path)

    def get_content(self, content_path: str) -> dict[str, Any]:
        """Get content.json from a specific path."""
        return self._fetch_json(content_path)

    def get_audio(self, audio_path: str) -> bytes:
        """Get audio file bytes from a specific path."""
        return self._fetch_bytes(audio_path)

    def list_topics(self) -> list[str]:
        """
        List all available topics by fetching the root index.
        
        Note: This requires a topics.json file at the root:
        {BASE_URL}/speaking-practice/topics.json
        
        Format: {"topics": ["alimentation", "environnement", ...]}
        """
        try:
            data = self._fetch_json("speaking-practice/topics.json")
            return data.get("topics", [])
        except Exception as e:
            logger.warning(f"[SPEAKING-PRACTICE] Could not fetch topics list: {e}")
            # Fallback: return known topics
            return [
                "alimentation",
                "collocations",
                "environnement",
                "reseaux_sociaux",
                "sante",
                "technologie",
                "travail",
                "uniforme",
                "vie_privee",
            ]


__all__ = ["SpeakingPracticeRepository"]
