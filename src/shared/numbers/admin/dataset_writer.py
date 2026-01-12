from __future__ import annotations

from datetime import datetime, timezone

from src.shared.numbers.models.stored import NumberDictationExercise
from src.infra.drive.repository import DriveRepository


ROOT_FOLDER = "NumbersDictation"
MANIFEST_FILENAME = "manifest.json"


class AdminDatasetWriter:
    """
    Admin-only writer responsible for creating and updating
    weekly Numbers Dictation datasets in Google Drive.

    Responsibilities:
    - Create dataset version folders
    - Accumulate exercises
    - Write manifest.json ONCE per version
    """

    def __init__(self, drive: DriveRepository) -> None:
        self.drive = drive
        self._version: str | None = None
        self._exercises: list[NumberDictationExercise] = []

    # ============================================================
    # Version lifecycle
    # ============================================================

    def start_version(self, version: str) -> None:
        """
        Initialize a new dataset version.
        Must be called exactly once before adding exercises.
        """
        if self._version is not None:
            raise RuntimeError("DatasetWriter already initialized")

        self._version = version
        self._exercises = []

        # Ensure folder exists
        self.drive.ensure_path(
            [
                "LearningTracker",
                ROOT_FOLDER,
                version,
            ]
        )

    # ============================================================
    # Add exercises
    # ============================================================

    def add_exercise(self, exercise: NumberDictationExercise) -> None:
        """
        Register an exercise to be written into the manifest.
        """
        if self._version is None:
            raise RuntimeError("start_version() must be called first")

        if exercise.version_tag != self._version:
            raise ValueError(
                f"Exercise version_tag '{exercise.version_tag}' "
                f"does not match current dataset version '{self._version}'"
            )

        self._exercises.append(exercise)

    # ============================================================
    # Persist manifest
    # ============================================================

    def flush(self) -> None:
        """
        Write manifest.json to Google Drive.
        This should be called exactly once after all exercises are added.
        """
        if self._version is None:
            raise RuntimeError("No dataset version initialized")

        folder_id = self.drive.ensure_path(
            [
                "LearningTracker",
                ROOT_FOLDER,
                self._version,
            ]
        )

        manifest = {
            "version": self._version,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "exercise_count": len(self._exercises),
            "exercises": [ex.model_dump(mode="json") for ex in self._exercises],
        }

        self.drive.upsert_json(
            parent_id=folder_id,
            name=MANIFEST_FILENAME,
            obj=manifest,
            app_properties={
                "type": "numbers_dictation_manifest",
                "version": self._version,
            },
        )

        # Reset internal state to prevent accidental reuse
        self._version = None
        self._exercises = []
