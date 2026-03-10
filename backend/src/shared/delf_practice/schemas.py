"""Schemas for DELF exam practice - JSON content models and API request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Union

from pydantic import BaseModel, Field


# ============================================================================
# DELF JSON Content Models (matching GitHub JSON structure)
# ============================================================================


class DelfImageOption(BaseModel):
    """Option with image for multiple_choice_image questions."""

    label: str = Field(..., min_length=1)
    img_url: str = Field(..., min_length=1)
    desc: str = Field(default="")


class DelfExercise(BaseModel):
    """Single exercise within a test paper."""

    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    question_text: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)  # "multiple_choice", "multiple_choice_image"
    options: list[Union[str, DelfImageOption]] = Field(default_factory=list)
    correct_answer: int = Field(..., ge=0)
    transcript: str | None = None
    explanation: str | None = None


class DelfExtraTranscript(BaseModel):
    """Extra transcript entry (documents without associated questions)."""

    id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class DelfTestPaper(BaseModel):
    """Full test paper content (matches GitHub JSON structure)."""

    test_id: str = Field(..., min_length=1)
    section: str = Field(..., min_length=1)
    audio_filename: str | None = None
    exercises: list[DelfExercise] = Field(default_factory=list)
    extra_transcripts: list[DelfExtraTranscript] = Field(default_factory=list)


# ============================================================================
# API Response Schemas
# ============================================================================


class DelfTestPaperResponse(BaseModel):
    """Lightweight test paper info for listing."""

    id: str
    test_id: str
    level: str
    variant: str
    section: str
    exercise_count: int
    audio_filename: str | None = None
    status: str
    created_at: datetime


class DelfTestPaperDetailResponse(DelfTestPaperResponse):
    """Full test paper detail with content from GitHub."""

    updated_at: datetime
    github_path: str
    # Content from GitHub (populated when fetched)
    content: DelfTestPaper | None = None
    # Resolved URLs for audio and assets
    audio_url: str | None = None


# ============================================================================
# Admin API Request Schemas
# ============================================================================


class CreateDelfTestPaperRequest(BaseModel):
    """Request to register a new DELF test paper."""

    test_id: str = Field(..., min_length=1, max_length=50)
    level: str = Field(..., pattern="^(A1|A2|B1|B2|C1|C2)$")
    variant: str = Field(..., min_length=1, max_length=100)
    section: str = Field(..., min_length=1, max_length=100)
    exercise_count: int = Field(default=0, ge=0)
    audio_filename: str | None = None
    status: str = Field(default="active", pattern="^(active|draft|archived)$")


class UpdateDelfTestPaperRequest(BaseModel):
    """Request to update a DELF test paper."""

    exercise_count: int | None = Field(None, ge=0)
    audio_filename: str | None = None
    status: str | None = Field(None, pattern="^(active|draft|archived)$")


__all__ = [
    # Content models
    "DelfImageOption",
    "DelfExercise",
    "DelfExtraTranscript",
    "DelfTestPaper",
    # Response schemas
    "DelfTestPaperResponse",
    "DelfTestPaperDetailResponse",
    # Request schemas
    "CreateDelfTestPaperRequest",
    "UpdateDelfTestPaperRequest",
]
