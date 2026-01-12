from __future__ import annotations

from src.infra.drive.repository import DriveRepository


AUDIO_MIME = "audio/mpeg"
ROOT_FOLDER = "NumbersDictation"


class AdminAudioStorage:
    """
    Admin-only service responsible for persisting TTS audio
    files in Google Drive and returning stable references.

    Runtime code must NEVER use this.
    """

    def __init__(self, drive: DriveRepository) -> None:
        self.drive = drive

    def _get_audio_folder(self, version: str) -> str:
        """
        Ensure and return the Drive folder where audio files
        for a given dataset version are stored.
        """
        return self.drive.ensure_path(
            [
                "LearningTracker",
                ROOT_FOLDER,
                version,
                "audio",
            ]
        )

    def save_audio(
        self,
        *,
        audio_bytes: bytes,
        exercise_id: str,
        version: str,
    ) -> str:
        """
        Save audio bytes to Drive and return the file ID (audio_ref).
        """
        folder_id = self._get_audio_folder(version)
        filename = f"{exercise_id}.mp3"

        file_id = self.drive.upload_file(
            parent_id=folder_id,
            name=filename,
            media=audio_bytes,
            mime_type=AUDIO_MIME,
            app_properties={
                "id": exercise_id,
                "type": "numbers_dictation_audio",
                "version": version,
            },
        )

        return file_id
