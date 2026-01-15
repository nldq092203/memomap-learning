from __future__ import annotations

"""Schemas for CO/CE practice manifest, transcript and questions files."""

from datetime import datetime

from pydantic import BaseModel, Field


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


class CoCeQuestion(BaseModel):
    """Single QCM question."""

    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)  # e.g. single_choice, multiple_choice, etc.
    question: str = Field(..., min_length=1)
    options: list[str] = Field(default_factory=list)
    correct_indices: list[int] = Field(default_factory=list)
    explanation: str | None = None


class CoCeQuestionsMeta(BaseModel):
    """Meta section for CO/CE questions file."""

    type: str = Field(..., min_length=1)  # compréhension_orale / compréhension_écrite / ...
    niveau: str = Field(..., min_length=1)
    titre: str = Field(..., min_length=1)
    consigne: str | None = None
    total_questions: int | None = None


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


class UpdateExerciseRequest(BaseModel):
    """Request to update an exercise."""

    name: str | None = Field(None, min_length=1, max_length=200)
    level: str | None = Field(None, pattern="^(A1|A2|B1|B2|C1|C2)$")
    duration_seconds: int | None = Field(None, ge=0)
    media_id: str | None = Field(None, min_length=1)
    media_type: str | None = Field(None, pattern="^(audio|video)$")


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


class ExerciseDetail(BaseModel):
    """Detailed exercise information."""

    id: str
    name: str
    level: str
    duration_seconds: int
    media_type: str
    media_id: str
    co_path: str | None = None
    ce_path: str | None = None
    transcript_path: str | None = None
    created_at: datetime
    updated_at: datetime

    # Computed URLs
    audio_url: str | None = None
    video_url: str | None = None
    co_github_url: str | None = None
    ce_github_url: str | None = None
    transcript_github_url: str | None = None


