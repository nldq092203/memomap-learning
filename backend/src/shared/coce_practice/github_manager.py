"""GitHub manager for CO/CE practice files."""

from __future__ import annotations

import base64

import requests

from src.config import Config
from src.extensions import logger


class GitHubCoCeManager:
    """Manage CO/CE practice files in GitHub repository."""

    def __init__(self, github_token: str | None = None):
        self.token = github_token or getattr(Config, "GITHUB_TOKEN", None)
        self.repo_owner = getattr(Config, "GITHUB_REPO_OWNER", "nldq092203")
        self.repo_name = getattr(Config, "GITHUB_REPO_NAME", "memomap-audio-fr")
        self.base_branch = "main"
        self.api_base = "https://api.github.com"

    def _headers(self) -> dict:
        """GitHub API headers with authentication."""
        if not self.token:
            raise ValueError("GitHub token is required for API operations")
        return {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
        }

    def create_or_update_file(
        self,
        file_path: str,
        content: str,
        commit_message: str,
    ) -> dict:
        """
        Create or update a file in GitHub.

        Args:
            file_path: Path in repo, e.g., "co-ce-practice/B2/uuid/questions_co.json"
            content: File content (will be base64 encoded)
            commit_message: Git commit message

        Returns:
            GitHub API response with file details
        """
        url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/contents/{file_path}"

        # Check if file exists to get SHA
        try:
            existing = requests.get(url, headers=self._headers(), timeout=10)
            sha = existing.json().get("sha") if existing.status_code == 200 else None
        except Exception as e:
            logger.warning(f"[GITHUB-MANAGER] Could not check existing file: {e}")
            sha = None

        # Encode content
        encoded_content = base64.b64encode(content.encode()).decode()

        payload = {
            "message": commit_message,
            "content": encoded_content,
            "branch": self.base_branch,
        }
        if sha:
            payload["sha"] = sha  # Required for updates

        response = requests.put(url, json=payload, headers=self._headers(), timeout=30)
        
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(f"[GITHUB-MANAGER] Error creating/updating file: {e}")
            logger.error(f"[GITHUB-MANAGER] Response body: {response.text}")
            if response.status_code == 403:
                raise ValueError(
                    "GitHub API Permission Denied (403). "
                    "Please check that your GITHUB_TOKEN has the 'repo' (or 'public_repo') scope."
                )
            raise


        logger.info(
            f"[GITHUB-MANAGER] {'Updated' if sha else 'Created'} file: {file_path}"
        )
        return response.json()

    def delete_file(self, file_path: str, commit_message: str) -> dict:
        """Delete a file from GitHub."""
        url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/contents/{file_path}"

        # Get current SHA (required for deletion)
        existing = requests.get(url, headers=self._headers(), timeout=10)
        existing.raise_for_status()
        sha = existing.json()["sha"]

        payload = {
            "message": commit_message,
            "sha": sha,
            "branch": self.base_branch,
        }

        response = requests.delete(url, json=payload, headers=self._headers(), timeout=30)
        response.raise_for_status()

        logger.info(f"[GITHUB-MANAGER] Deleted file: {file_path}")
        return response.json()

    def generate_paths(self, level: str, media_id: str) -> dict:
        """Generate file paths for an exercise."""
        base = f"co-ce-practice/{level.upper()}/{media_id}"
        return {
            "co_path": f"{base}/questions_co.json",
            "ce_path": f"{base}/questions_ce.json",
            "transcript_path": f"{base}/transcript.json",
            "audio_path": f"{base}/audio.mp3",
        }


__all__ = ["GitHubCoCeManager"]
