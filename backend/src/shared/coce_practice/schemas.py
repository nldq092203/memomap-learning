from __future__ import annotations

"""Schemas for CO/CE practice manifest, transcript and questions files."""

import re
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator

_FIELD_LABEL_RE = re.compile(
    r"\s+(Nom|Origine|Ville actuelle|Occupation|À propos de moi|Objectif professionnel|"
    r"Objectif|Adresse|Date|Lieu|Source|Titre)\s*:",
    re.IGNORECASE,
)


def _format_readable_text(value: str | None) -> str | None:
    """Normalize long learning text for GitHub storage and frontend display."""

    if value is None:
        return None

    text = value.replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n"))
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\s+Texte\s*:\s*", "\n\nTexte :\n", text, flags=re.IGNORECASE)
    text = _FIELD_LABEL_RE.sub(r"\n\1 :", text)
    text = re.sub(r"([.!?])\s+(?=[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ])", r"\1\n", text)
    return text.strip()


class ExerciseTopic(str, Enum):
    """Exercise topic/category for filtering."""

    # Common topics
    POLITICS = "politics"
    HEALTH = "health"
    ENVIRONMENT = "environment"
    CULTURE = "culture"
    TECHNOLOGY = "technology"
    SOCIETY = "society"
    ECONOMY = "economy"
    SCIENCE = "science"
    EDUCATION = "education"
    SPORTS = "sports"
    FOOD = "food"
    TRANSPORT = "transport"
    HOUSING = "housing"
    AGRICULTURE = "agriculture"
    MUSIC = "music"
    ART = "art"
    HISTORY = "history"
    GEOGRAPHY = "geography"
    OTHER = "other"


class CoCeManifestExercise(BaseModel):
    """Single entry in manifest.json."""

    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    duration_seconds: int = Field(..., ge=0)


class CoCeManifest(BaseModel):
    """manifest.json structure."""

    exercises: list[CoCeManifestExercise] = Field(default_factory=list)


class CoCeTranscript(BaseModel):
    """transcript.json structure for a CO/CE exercise."""

    id: str = Field(..., min_length=1)
    created_at: datetime
    updated_at: datetime
    name: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    # Accept string or int in source, coerce to int.
    duration_seconds: int = Field(..., ge=0)
    transcript: str = Field(..., min_length=1)
    audio_filename: str = Field(..., min_length=1)
    audio_mime_type: str = Field(..., min_length=1)

    @field_validator("transcript")
    @classmethod
    def normalize_transcript(cls, value: str) -> str:
        return _format_readable_text(value) or value


class CoCeQuestion(BaseModel):
    """Single QCM question."""

    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)  # e.g. single_choice, multiple_choice, etc.
    question: str = Field(..., min_length=1)
    options: list[str] = Field(default_factory=list)
    correct_indices: list[int] = Field(default_factory=list)
    explanation: str | None = None

    @field_validator("question", "explanation")
    @classmethod
    def normalize_long_text(cls, value: str | None) -> str | None:
        return _format_readable_text(value)


class CoCeQuestionsMeta(BaseModel):
    """Meta section for CO/CE questions file."""

    type: str = Field(
        ..., min_length=1
    )  # compréhension_orale / compréhension_écrite / ...
    niveau: str = Field(..., min_length=1)
    titre: str = Field(..., min_length=1)
    consigne: str | None = None
    total_questions: int | None = None

    @field_validator("consigne")
    @classmethod
    def normalize_consigne(cls, value: str | None) -> str | None:
        return _format_readable_text(value)


class CoCeQuestionsFile(BaseModel):
    """questions_{co,ce}.json structure."""

    meta: CoCeQuestionsMeta
    questions: list[CoCeQuestion] = Field(default_factory=list)


__all__ = [
    "CoCeManifest",
    "CoCeManifestExercise",
    "CoCeTranscript",
    "CoCeQuestionsFile",
    "CoCeQuestionsMeta",
    "CoCeQuestion",
    # Admin API schemas
    "CreateExerciseRequest",
    "UpdateExerciseRequest",
    "SaveQcmRequest",
    "SaveTranscriptRequest",
    "ExerciseDetail",
    "ExerciseResponse",
]


# ============================================================================
# Admin API Request Schemas
# ============================================================================


class CreateExerciseRequest(BaseModel):
    """Request to create a new exercise."""

    name: str = Field(..., min_length=1, max_length=200)
    level: str = Field(..., pattern="^(A1|A2|B1|B2|C1|C2)$")
    duration_seconds: int = Field(..., ge=0)
    media_id: str = Field(..., min_length=1)  # YouTube video ID or audio UUID
    media_type: str = Field(default="audio", pattern="^(audio|video)$")
    topic: ExerciseTopic | None = Field(
        default=None, description="Exercise topic/category"
    )


class UpdateExerciseRequest(BaseModel):
    """Request to update an exercise."""

    name: str | None = Field(None, min_length=1, max_length=200)
    level: str | None = Field(None, pattern="^(A1|A2|B1|B2|C1|C2)$")
    duration_seconds: int | None = Field(None, ge=0)
    media_id: str | None = Field(None, min_length=1)
    media_type: str | None = Field(None, pattern="^(audio|video)$")
    topic: ExerciseTopic | None = Field(None, description="Exercise topic/category")


class SaveQcmRequest(BaseModel):
    """Request to save QCM data to GitHub."""

    exercise_id: str
    variant: str = Field(..., pattern="^(co|ce)$")  # 'co' or 'ce'
    qcm_data: CoCeQuestionsFile  # The actual QCM content


class SaveTranscriptRequest(BaseModel):
    """Request to save transcript data to GitHub."""

    exercise_id: str
    transcript_data: CoCeTranscript  # The actual transcript content


# ============================================================================
# Response Schemas
# ============================================================================


class ExerciseResponse(BaseModel):
    """Base exercise information for lists."""

    id: str
    name: str
    level: str
    duration_seconds: int
    media_type: str
    media_id: str
    topic: ExerciseTopic | None = None
    created_at: datetime

    # Computed URLs
    audio_url: str | None = None
    video_url: str | None = None


class ExerciseDetail(ExerciseResponse):
    """Detailed exercise information."""

    updated_at: datetime

    # File paths (internal use mostly, but good for debug)
    co_path: str | None = None
    ce_path: str | None = None
    transcript_path: str | None = None

    # Computed GitHub URLs (for frontend to fetch content)
    co_github_url: str | None = None
    ce_github_url: str | None = None
    transcript_github_url: str | None = None
