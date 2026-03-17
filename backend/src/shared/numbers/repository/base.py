from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.stored import NumberDictationExercise


class NumbersExerciseRepository(ABC):
    """
    Abstract repository for Numbers Dictation exercises.

    This interface is consumed by the session engine.
    Implementations may use Google Drive, local FS, DB, etc.
    """

    @abstractmethod
    def list_by_types(
        self,
        types: Iterable[NumberType],
        *,
        guest_preview_only: bool = False,
    ) -> list[NumberDictationExercise]:
        """
        Return all available exercises matching the given number types.
        """
        raise NotImplementedError
