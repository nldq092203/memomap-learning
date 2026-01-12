from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Iterable
from uuid import uuid4

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.stored import NumberDictationExercise
from src.shared.numbers.models.session import (
    AnswerResult,
    DigitError,
    NumberDictationSession,
    NumberExerciseState,
    PerTypeStats,
    SessionSummary,
)
from src.shared.numbers.repository.base import NumbersExerciseRepository
from src.shared.numbers.repository.github_repo import (
    GitHubNumbersExerciseRepository,
)
from src.config import Config


# ============================================================
# Repository access (singleton-style for MVP)
# ============================================================

_REPO: NumbersExerciseRepository | None = None


def _get_repo() -> NumbersExerciseRepository:
    global _REPO
    if _REPO is None:
        base_url = Config.NUMBERS_AUDIO_BASE_URL
        version = Config.NUMBERS_DATA_VERSION
        lang = Config.NUMBERS_DATA_LANG or "fr"

        if not base_url:
            raise RuntimeError(
                "NUMBERS_AUDIO_BASE_URL is not configured; cannot load Numbers dataset "
                "from GitHub."
            )
        if not version:
            raise RuntimeError(
                "NUMBERS_DATA_VERSION is not configured; please set it to a dataset "
                "version like '2025-W50'."
            )

        _REPO = GitHubNumbersExerciseRepository(
            base_url=base_url,
            version=version,
            lang=lang,
        )
    return _REPO


# ============================================================
# Session Generator
# ============================================================


class NumbersSessionGenerator:
    """
    Build Numbers Dictation sessions from pre-generated exercises.

    IMPORTANT:
    - No AI
    - No TTS
    - No number generation
    - Only sampling from repository
    """

    def __init__(self, rng: random.Random | None = None) -> None:
        self._rng = rng or random.Random()

    def generate_exercises(
        self,
        types: Iterable[NumberType],
        count: int,
    ) -> list[NumberDictationExercise]:
        if count <= 0:
            raise ValueError("count must be positive")

        type_list = list(types)
        if not type_list:
            raise ValueError("At least one number type is required")

        repo = _get_repo()
        available = repo.list_by_types(type_list)

        if not available:
            raise ValueError(
                "No pre-generated Numbers Dictation exercises available "
                "for the requested types."
            )

        if count > len(available):
            raise ValueError(
                f"Requested {count} exercises but only {len(available)} distinct "
                "exercises are available for the requested types."
            )

        # Sample WITHOUT replacement to avoid duplicates in a single session
        return self._rng.sample(available, k=count)

    def create_session(
        self,
        types: Iterable[NumberType],
        count: int,
    ) -> NumberDictationSession:
        exercises = self.generate_exercises(types, count)

        states = [NumberExerciseState(exercise=exercise) for exercise in exercises]

        return NumberDictationSession(
            types=list(types),
            exercises=states,
        )


# ============================================================
# In-memory session store (MVP)
# ============================================================

_SESSIONS: dict[str, NumberDictationSession] = {}


def save_session(session: NumberDictationSession) -> NumberDictationSession:
    _SESSIONS[session.id] = session
    return session


def get_session(session_id: str) -> NumberDictationSession | None:
    return _SESSIONS.get(session_id)


# ============================================================
# Session navigation
# ============================================================


def get_next_exercise(
    session: NumberDictationSession,
) -> NumberExerciseState | None:
    """
    Return the next unanswered exercise in the session,
    or None if the session is complete.
    """
    for idx, state in enumerate(session.exercises):
        if state.result is None:
            session.current_index = idx
            return state
    return None


# ============================================================
# Answer checking
# ============================================================


def check_answer(
    user_input: str,
    exercise: NumberDictationExercise,
) -> AnswerResult:
    """
    Deterministic digit-by-digit answer checking.

    - No AI
    - Exact match after lightweight normalization
    - Treats ',' and '.' as equivalent numeric separators so that
      users can use either decimal convention for prices.
    """
    # Normalize both expected digits and user input so that
    # comma and dot are treated as the same separator.
    expected = exercise.digits.replace(",", ".")
    user_normalized = user_input.replace(",", ".")

    errors: list[DigitError] = []

    max_len = max(len(expected), len(user_normalized))
    for index in range(max_len):
        exp_ch = expected[index] if index < len(expected) else ""
        got_ch = user_normalized[index] if index < len(user_normalized) else ""
        if exp_ch != got_ch:
            errors.append(
                DigitError(
                    index=index,
                    expected=exp_ch,
                    got=got_ch,
                )
            )

    return AnswerResult(
        is_correct=len(errors) == 0,
        errors=errors,
    )


def apply_answer(
    session: NumberDictationSession,
    exercise_id: str,
    user_input: str,
) -> tuple[NumberExerciseState, AnswerResult]:
    """
    Attach a user answer to a specific exercise in the session.
    """
    target: NumberExerciseState | None = None

    for state in session.exercises:
        if state.id == exercise_id:
            target = state
            break

    if target is None:
        raise ValueError(f"Exercise with id {exercise_id} not found in session")

    result = check_answer(user_input, target.exercise)
    target.user_input = user_input
    target.result = result

    return target, result


# ============================================================
# Session summary
# ============================================================


def compute_summary(session: NumberDictationSession) -> SessionSummary:
    """
    Compute per-type statistics and overall score for a session.
    """
    total = len(session.exercises)
    answered = 0
    correct = 0

    per_type: dict[NumberType, PerTypeStats] = {}

    for state in session.exercises:
        if state.result is None:
            continue

        answered += 1
        is_correct = state.result.is_correct
        if is_correct:
            correct += 1

        ntype = state.exercise.number_type
        if ntype not in per_type:
            per_type[ntype] = PerTypeStats(
                number_type=ntype,
                total=0,
                correct=0,
                incorrect=0,
            )

        stats = per_type[ntype]
        stats.total += 1
        if is_correct:
            stats.correct += 1
        else:
            stats.incorrect += 1

    incorrect = answered - correct
    score = float(correct) / total if total > 0 else 0.0

    return SessionSummary(
        session_id=session.id,
        total_exercises=total,
        answered=answered,
        correct=correct,
        incorrect=incorrect,
        score=score,
        per_type=list(per_type.values()),
        extra=None,
    )


__all__ = [
    "NumbersSessionGenerator",
    "save_session",
    "get_session",
    "get_next_exercise",
    "check_answer",
    "apply_answer",
    "compute_summary",
]
