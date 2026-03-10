"""GitHub repository for fetching DELF exam content."""

from __future__ import annotations

from typing import Any

import requests

from src.config import Config
from src.extensions import logger
from src.shared.delf_practice.schemas import DelfTestPaper


class GitHubDelfRepository:
    """Fetch DELF exam content from GitHub raw URLs."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        base = base_url or getattr(Config, "NUMBERS_AUDIO_BASE_URL", "").rstrip("/")
        if not base:
            raise ValueError("DELF GitHub base URL is not configured")

        self.base_url = base
        self.timeout = timeout

    # -------------------------------------------------
    # URL helpers
    # -------------------------------------------------

    def _delf_prefix(self, level: str, variant: str, section: str) -> str:
        return f"{self.base_url}/delf/{level.lower()}/{variant}/{section}"

    def test_paper_url(self, github_path: str) -> str:
        """Construct raw URL for a test paper JSON file."""
        return f"{self.base_url}/{github_path}"

    def audio_url(self, level: str, variant: str, section: str, filename: str) -> str:
        """Construct raw URL for an audio file."""
        return f"{self._delf_prefix(level, variant, section)}/audio/{filename}"

    def asset_url(self, level: str, variant: str, section: str, filename: str) -> str:
        """Construct raw URL for an image asset."""
        return f"{self._delf_prefix(level, variant, section)}/assets/{filename}"

    # -------------------------------------------------
    # Content fetching
    # -------------------------------------------------

    def fetch_json(self, url: str) -> Any:
        """Fetch and parse JSON from a URL."""
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def fetch_test_paper(self, github_path: str) -> DelfTestPaper:
        """Fetch and validate a test paper JSON from GitHub."""
        url = self.test_paper_url(github_path)
        logger.info(f"[DELF-GITHUB-REPO] Fetching test paper from {url}")
        data = self.fetch_json(url)
        return DelfTestPaper.model_validate(data)

    def fetch_raw(self, url: str) -> requests.Response:
        """Fetch raw content (audio/image) from GitHub, returning the response for streaming."""
        resp = requests.get(url, timeout=30, stream=True)
        resp.raise_for_status()
        return resp


__all__ = ["GitHubDelfRepository"]
