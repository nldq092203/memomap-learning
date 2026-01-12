from __future__ import annotations

from typing import Iterable

from src.config import Config
from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.models.stored import NumberDictationExercise
from src.shared.numbers.repository.base import NumbersExerciseRepository
from src.infra.drive.repository import DriveRepository


ROOT_FOLDER = "NumbersDictation"
MANIFEST_FILENAME = "manifest.json"


class GoogleDriveNumbersExerciseRepository(NumbersExerciseRepository):
    """
    NumbersExerciseRepository backed by Google Drive.

    Reads admin-generated weekly datasets from the current user's
    LearningTracker tree and exposes them as domain objects.
    """

    def __init__(self, drive: DriveRepository) -> None:
        self.drive = drive

    # -------------------------------------------------
    # Internal helpers
    # -------------------------------------------------

    def _get_root_folder_id(self) -> str:
        """
        Resolve the root folder for Numbers Dictation datasets.

        If NUMBERS_STORE_ROOT is configured, we treat it as the shared
        admin-owned folder ID so that all users can read the same
        pre-generated dataset. Otherwise, fall back to a per-user
        LearningTracker tree under the app root.
        """
        if Config.NUMBERS_STORE_ROOT:
            return Config.NUMBERS_STORE_ROOT

        # Default: store under <app-root>/LearningTracker/NumbersDictation
        return self.drive.ensure_path(["LearningTracker", ROOT_FOLDER])

    def _load_manifest(
        self,
        folder_id: str,
    ) -> list[NumberDictationExercise]:
        data = self.drive.get_json(folder_id, MANIFEST_FILENAME)
        if not data:
            return []

        exercises = data.get("exercises", [])
        return [NumberDictationExercise(**ex) for ex in exercises]

    # -------------------------------------------------
    # Repository API
    # -------------------------------------------------

    def list_by_types(
        self,
        types: Iterable[NumberType],
    ) -> list[NumberDictationExercise]:
        root_id = self._get_root_folder_id()

        # List all version folders
        versions_result = self.drive.list_items(
            parent_id=root_id,
            page_size=100,
            order_by="name desc",
        )

        exercises: list[NumberDictationExercise] = []
        wanted = set(types)

        for item in versions_result.get("files", []):
            version_folder_id = item["id"]
            version_exercises = self._load_manifest(version_folder_id)

            for ex in version_exercises:
                if ex.number_type in wanted:
                    exercises.append(ex)

        return exercises
