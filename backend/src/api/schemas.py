"""Request/Response schemas using Pydantic."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any


class SessionCreateRequest(BaseModel):
    """Create session request."""

    language: str = Field(..., min_length=2, max_length=16)
    name: str = Field(..., min_length=1, max_length=200)
    duration_seconds: int = Field(..., ge=0)
    tags: list[str] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class TranscriptCreateRequest(BaseModel):
    """Create transcript request."""

    language: str = Field(..., min_length=2, max_length=16)
    source_url: str | None = None
    transcript: str | None = None
    notes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    lesson_audio_folder_id: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class TranscriptUpdateRequest(BaseModel):
    """Update transcript request."""

    source_url: str | None = None
    transcript: str | None = None
    notes: list[str] | None = None
    tags: list[str] | None = None
    lesson_audio_folder_id: str | None = None
    extra: dict[str, Any] | None = None


class VocabCreateRequest(BaseModel):
    """Create vocabulary card request."""

    language: str = Field(..., min_length=2, max_length=16)
    word: str = Field(..., min_length=1, max_length=100)
    translation: str | None = None
    notes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class VocabUpdateRequest(BaseModel):
    """Update vocabulary card request."""

    word: str | None = None
    translation: str | None = None
    notes: list[str] | None = None
    tags: list[str] | None = None
    extra: dict[str, Any] | None = None


class VocabReviewRequest(BaseModel):
    """Batch vocabulary review request."""

    reviews: list[dict[str, str]]


class AIExplainRequest(BaseModel):
    """AI explain text request."""

    text: str = Field(..., min_length=1)
    language: str = Field(default="fr")
    context: str | None = None


class AIChatRequest(BaseModel):
    """AI chat request."""

    message: str = Field(..., min_length=1)
    language: str = Field(default="fr")
    conversation_id: str | None = None


class NumbersSessionRequest(BaseModel):
    """Numbers dictation session request."""

    language: str = Field(default="fr")
    difficulty: str = Field(default="medium")
    count: int = Field(default=10, ge=1, le=50)

