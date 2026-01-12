from __future__ import annotations

"""
GitHub-backed NumbersExerciseRepository.

This repository reads pre-generated Numbers Dictation datasets from a
public Git (or generic HTTP) storage instead of Google Drive.

Dataset layout (example for French):
  <BASE_URL>/fr/<version>/manifest.json

Where:
  - BASE_URL comes from Config.NUMBERS_AUDIO_BASE_URL, e.g.
    https://raw.githubusercontent.com/nldq092203/memomap-number-dictation-audio/main
  - version comes from Config.NUMBERS_DATA_VERSION, e.g. "2025-W50"
"""

from typing import Iterable

import requests

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.stored import NumberDictationExercise
from src.shared.numbers.repository.base import NumbersExerciseRepository
from src.extensions import logger


class GitHubNumbersExerciseRepository(NumbersExerciseRepository):
    """
    Load Numbers Dictation exercises from a static manifest hosted on GitHub
    (or any HTTP-accessible endpoint).
    """

    def __init__(
        self,
        *,
        base_url: str,
        version: str,
        lang: str = "fr",
        timeout: float = 10.0,
    ) -> None:
        if not base_url:
            raise ValueError("base_url must be provided for GitHubNumbersExerciseRepository")
        if not version:
            raise ValueError("version must be provided for GitHubNumbersExerciseRepository")

        self.base_url = base_url.rstrip("/")
        self.version = version
        self.lang = lang
        self.timeout = timeout

        self._exercises_cache: list[NumberDictationExercise] | None = None

    # -------------------------------------------------
    # Internal helpers
    # -------------------------------------------------

    def _manifest_url(self) -> str:
        return f"{self.base_url}/{self.lang}/{self.version}/manifest.json"

    def _load_all_exercises(self) -> list[NumberDictationExercise]:
        """
        Fetch and cache all exercises from the manifest.
        """
        if self._exercises_cache is not None:
            return self._exercises_cache

        url = self._manifest_url()
        logger.info(f"[NUMBERS-GITHUB-REPO] Fetching manifest from {url}")
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()

        try:
            data = resp.json()
        except ValueError as e:
            # Provide a clearer error message including a small preview
            # of the response body to help diagnose invalid JSON.
            body_preview = resp.text[:200].replace("\n", "\\n")
            logger.error(
                f"[NUMBERS-GITHUB-REPO] Failed to parse manifest JSON from {url}: {e} "
                f"| body_preview={body_preview!r}"
            )
            raise ValueError(
                f"Failed to parse Numbers Dictation manifest at {url}: {e}"
            ) from e

        raw_exercises = data.get("exercises", [])
        exercises = [NumberDictationExercise(**ex) for ex in raw_exercises]
        self._exercises_cache = exercises
        return exercises

    # -------------------------------------------------
    # Repository API
    # -------------------------------------------------

    def list_by_types(
        self,
        types: Iterable[NumberType],
    ) -> list[NumberDictationExercise]:
        wanted = set(types)
        all_exercises = self._load_all_exercises()
        return [ex for ex in all_exercises if ex.number_type in wanted]


__all__ = ["GitHubNumbersExerciseRepository"]
