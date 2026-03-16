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


class DelfDocument(BaseModel):
    """Document entry for matching-type exercises."""

    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class DelfPerson(BaseModel):
    """Person entry for matching-type exercises."""

    label: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


class DelfEmailPart(BaseModel):
    """Part of an email document for labeling."""
    label: str
    excerpt: str


class DelfReadingDocument(BaseModel):
    """Embedded document for reading comprehension."""
    type: str | None = None
    title: str | None = None
    content: str | None = None
    sender: str | None = Field(None, alias="from")
    subject: str | None = None
    body: str | None = None
    parts: list[DelfEmailPart] = Field(default_factory=list)


class DelfLabelOption(BaseModel):
    """Label for label_matching questions."""
    number: int
    description: str


class DelfSubQuestion(BaseModel):
    """Nested question inside an exercise."""
    id: str = Field(..., min_length=1)
    number: int | None = None
    question_text: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    
    # MCQ / Single Choice
    options: list[Union[str, DelfImageOption]] = Field(default_factory=list)
    correct_answer: int | None = None
    points: float | None = None
    explanation: str | None = None
    
    # Label matching
    labels: list[DelfLabelOption] = Field(default_factory=list)
    # Can be dict {"A": 1} for label_matching, or list ["a", "b"] for multiple_select_image
    correct_answers: Union[dict[str, int], list[str], None] = None


class DelfExercise(BaseModel):
    """Single exercise within a test paper.
    
    Supports multiple exercise types:
    - multiple_choice / multiple_choice_image: uses options + correct_answer
    - matching: uses documents + persons + correct_answers (dict)
    """

    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    question_text: str | None = None  # Now optional because nested exercises don't have it
    type: str = Field(..., min_length=1)
    instruction: str | None = None

    # --- Nested Questions & Documents ---
    document: DelfReadingDocument | None = None
    questions: list[DelfSubQuestion] = Field(default_factory=list)

    # --- Flat MCQ fields (Legacy/Flat format) ---
    options: list[Union[str, DelfImageOption]] = Field(default_factory=list)
    correct_answer: int | None = None
    points: float | None = None
    transcript: str | None = None
    explanation: str | None = None

    # --- Matching fields ---
    documents: list[DelfDocument] = Field(default_factory=list)
    persons: list[DelfPerson] = Field(default_factory=list)
    correct_answers: dict[str, str] | None = None  # e.g. {"doc_1": "E", ...}
    unmatched_persons: list[str] = Field(default_factory=list)
    explanations: dict[str, str] | None = None  # e.g. {"doc_1": "...", "A": "..."}


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


class SaveDelfTestContentRequest(BaseModel):
    """Request to save the full test paper JSON content to GitHub."""

    test_paper_id: str | None = Field(default=None, min_length=1)
    level: str | None = Field(default=None, pattern="^(A1|A2|B1|B2|C1|C2)$")
    variant: str | None = Field(default=None, min_length=1, max_length=100)
    section: str | None = Field(default=None, min_length=1, max_length=100)
    status: str = Field(default="active", pattern="^(active|draft|archived)$")
    content: DelfTestPaper


class UploadDelfRepoFileRequest(BaseModel):
    """Request to upload an asset/audio file to GitHub via base64 payload."""

    test_paper_id: str = Field(..., min_length=1)
    folder: str = Field(..., pattern="^(assets|audio)$")
    filename: str = Field(..., min_length=1, max_length=255)
    content_base64: str = Field(..., min_length=1)
    update_audio_filename: bool = False


__all__ = [
    # Content models
    "DelfImageOption",
    "DelfDocument",
    "DelfPerson",
    "DelfEmailPart",
    "DelfReadingDocument",
    "DelfLabelOption",
    "DelfSubQuestion",
    "DelfExercise",
    "DelfExtraTranscript",
    "DelfTestPaper",
    # Response schemas
    "DelfTestPaperResponse",
    "DelfTestPaperDetailResponse",
    # Request schemas
    "CreateDelfTestPaperRequest",
    "UpdateDelfTestPaperRequest",
    "SaveDelfTestContentRequest",
    "UploadDelfRepoFileRequest",
]
