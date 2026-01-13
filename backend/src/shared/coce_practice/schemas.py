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
    consigne: str = Field(..., min_length=1)
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
]

