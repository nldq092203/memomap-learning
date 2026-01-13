from __future__ import annotations

"""
GitHub-backed repository for CO/CE practice exercises.

Layout example (for level B2):

<BASE_URL>/co-ce-practice/B2/manifest.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/audio.mp3
<BASE_URL>/co-ce-practice/B2/<exercise_id>/transcript.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_co.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_ce.json
"""

from typing import Any

import requests

from src.config import Config
from src.extensions import logger
from src.shared.coce_practice.schemas import (
    CoCeManifest,
    CoCeTranscript,
    CoCeQuestionsFile,
)

class CoCeExercise:
    """Internal representation of a CO/CE exercise."""

    def __init__(self, id: str, name: str, duration_seconds: int) -> None:
        self.id = id
        self.name = name
        self.duration_seconds = duration_seconds


class GitHubCoCePracticeRepository:
    """Load CO/CE practice exercises from a GitHub-hosted manifest."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        level: str = "B2",
        lang: str = "fr",
        timeout: float = 10.0,
    ) -> None:
        base = base_url or getattr(Config, "NUMBERS_AUDIO_BASE_URL", "").rstrip("/")
        if not base:
            raise ValueError("CO/CE practice base URL is not configured")

        self.base_url = base
        self.level = level.upper()
        self.lang = lang
        self.timeout = timeout

        self._manifest_cache: list[CoCeExercise] | None = None

    # -------------------------------------------------
    # URL helpers
    # -------------------------------------------------

    def _root_prefix(self) -> str:
        # We ignore lang in the path for now and keep it implicit in level/manifest.
        return f"{self.base_url}/co-ce-practice/{self.level}"

    def manifest_url(self) -> str:
        return f"{self._root_prefix()}/manifest.json"

    def audio_url(self, exercise_id: str) -> str:
        return f"{self._root_prefix()}/{exercise_id}/audio.mp3"

    def transcript_url(self, exercise_id: str) -> str:
        return f"{self._root_prefix()}/{exercise_id}/transcript.json"

    def questions_url(self, exercise_id: str, variant: str) -> str:
        suffix = variant.lower()
        return f"{self._root_prefix()}/{exercise_id}/questions_{suffix}.json"

    # -------------------------------------------------
    # Manifest loading
    # -------------------------------------------------

    def _load_manifest(self) -> list[CoCeExercise]:
        if self._manifest_cache is not None:
            return self._manifest_cache

        url = self.manifest_url()
        logger.info(f"[COCE-GITHUB-REPO] Fetching manifest from {url}")
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()

        try:
            data = resp.json()
        except ValueError as e:
            body_preview = resp.text[:200].replace("\n", "\\n")
            logger.error(
                f"[COCE-GITHUB-REPO] Failed to parse manifest JSON from {url}: {e} "
                f"| body_preview={body_preview!r}"
            )
            raise ValueError(f"Failed to parse CO/CE manifest at {url}: {e}") from e

        manifest = CoCeManifest.model_validate(data)
        exercises = [
            CoCeExercise(
                id=ex.id,
                name=ex.name,
                duration_seconds=ex.duration_seconds,
            )
            for ex in manifest.exercises
        ]
        self._manifest_cache = exercises
        return exercises

    # -------------------------------------------------
    # Public API
    # -------------------------------------------------

    def list_exercises(self) -> list[CoCeExercise]:
        return self._load_manifest()

    def get_exercise(self, exercise_id: str) -> CoCeExercise | None:
        for ex in self._load_manifest():
            if ex.id == exercise_id:
                return ex
        return None

    def fetch_json(self, url: str) -> Any:
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def fetch_transcript(self, exercise_id: str) -> CoCeTranscript:
        url = self.transcript_url(exercise_id)
        data = self.fetch_json(url)
        return CoCeTranscript.model_validate(data)

    def fetch_questions(self, exercise_id: str, variant: str) -> CoCeQuestionsFile:
        url = self.questions_url(exercise_id, variant=variant)
        data = self.fetch_json(url)
        return CoCeQuestionsFile.model_validate(data)


__all__ = ["GitHubCoCePracticeRepository", "CoCeExercise"]
