from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.stored import NumberDictationExercise


class DigitError(BaseModel):
    """
    Single digit-level mismatch between expected and user input.
    """

    index: int
    expected: str
    got: str


class AnswerResult(BaseModel):
    """
    Deterministic result of a user answer.
    """

    is_correct: bool
    errors: list[DigitError]


class NumberExerciseState(BaseModel):
    """
    Session-scoped wrapper around a stored exercise.

    Holds user interaction state.
    """

    id: str = Field(default_factory=lambda: str(uuid4()))
    exercise: NumberDictationExercise
    user_input: str | None = None
    result: AnswerResult | None = None


class PerTypeStats(BaseModel):
    """
    Aggregated stats per NumberType.
    """

    number_type: NumberType
    total: int
    correct: int
    incorrect: int


class SessionSummary(BaseModel):
    """
    Final summary returned by the API.
    """

    session_id: str
    total_exercises: int
    answered: int
    correct: int
    incorrect: int
    score: float
    per_type: list[PerTypeStats]
    extra: dict[str, Any] | None = None


class NumberDictationSession(BaseModel):
    """
    In-memory Numbers Dictation session.
    """

    id: str = Field(default_factory=lambda: str(uuid4()))
    types: list[NumberType]
    exercises: list[NumberExerciseState]
    current_index: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
