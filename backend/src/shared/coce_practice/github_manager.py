"""GitHub manager for CO/CE practice files."""

from __future__ import annotations

from src.shared.github_manager import GitHubContentManager


class GitHubCoCeManager(GitHubContentManager):
    """Manage CO/CE practice files in GitHub repository."""

    def __init__(self, github_token: str | None = None):
        super().__init__(github_token, log_prefix="COCE-GITHUB-MANAGER")

    def generate_paths(self, level: str, media_id: str) -> dict:
        """Generate file paths for a CO/CE exercise."""
        base = f"co-ce-practice/{level.upper()}/{media_id}"
        return {
            "co_path": f"{base}/questions_co.json",
            "ce_path": f"{base}/questions_ce.json",
            "transcript_path": f"{base}/transcript.json",
            "audio_path": f"{base}/audio.mp3",
        }


__all__ = ["GitHubCoCeManager"]
