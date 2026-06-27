"""
Google Drive infrastructure (minimal).

This package is intentionally small and only supports the operations we need for:
- Learning Audio Lessons (Drive-backed)
- Numbers Dictation admin dataset generation (Drive-backed staging)

Auth model:
- Endpoints supply a Google OAuth access token (header) when they need Drive.
"""

from src.infra.drive.client import GoogleDriveClient
from src.infra.drive.repository import DriveRepository

__all__ = ["GoogleDriveClient", "DriveRepository"]
