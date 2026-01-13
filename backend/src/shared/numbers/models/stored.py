from __future__ import annotations

from datetime import datetime, timezone
from pydantic import BaseModel, Field

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.voices import FrenchVoice


class NumberDictationExercise(BaseModel):
    """
    Fully materialized Numbers Dictation exercise.

    This model represents ADMIN-GENERATED, IMMUTABLE content.
    It is stored in Google Drive and reused across sessions.
    """

    id: str  # Stable exercise ID
    number_type: NumberType  # YEAR / PHONE / PRICE / TIME / ADDRESS / ...
    digits: str  # e.g. "0632487091"
    spoken_chunks: list[str]  # ["zéro six", "trente-deux", ...]
    sentence: str  # With pauses ("…")
    audio_ref: str  # Drive file ID or storage key
    blueprint_id: str  # Sentence blueprint ID
    version_tag: str  # e.g. "2025-W37"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    voice: FrenchVoice | str

    class Config:
        frozen = True  # Immutable after creation
