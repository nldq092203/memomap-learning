"""Shared GitHub file manager for content repositories."""

from __future__ import annotations

import base64

import requests

from src.config import Config
from src.extensions import logger


class GitHubContentManager:
    """Create, update, and delete repository files through GitHub Contents API."""

    def __init__(
        self,
        github_token: str | None = None,
        *,
        log_prefix: str = "GITHUB-MANAGER",
    ):
        self.token = github_token or getattr(Config, "GITHUB_TOKEN", None)
        self.repo_owner = getattr(Config, "GITHUB_REPO_OWNER", "nldq092203")
        self.repo_name = getattr(Config, "GITHUB_REPO_NAME", "memomap-audio-fr")
        self.base_branch = "main"
        self.api_base = "https://api.github.com"
        self.log_prefix = log_prefix

    def _headers(self) -> dict:
        if not self.token:
            raise ValueError("GitHub token is required for API operations")
        return {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
        }

    def _content_url(self, file_path: str) -> str:
        return f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/contents/{file_path}"

    def create_or_update_file(
        self,
        file_path: str,
        content: str | bytes,
        commit_message: str,
    ) -> dict:
        """Create or update a file in GitHub."""
        url = self._content_url(file_path)

        try:
            existing = requests.get(url, headers=self._headers(), timeout=10)
            sha = existing.json().get("sha") if existing.status_code == 200 else None
        except Exception as exc:
            logger.warning(f"[{self.log_prefix}] Could not check existing file: {exc}")
            sha = None

        raw_content = content.encode("utf-8") if isinstance(content, str) else content
        encoded_content = base64.b64encode(raw_content).decode()
        payload = {
            "message": commit_message,
            "content": encoded_content,
            "branch": self.base_branch,
        }
        if sha:
            payload["sha"] = sha

        response = requests.put(url, json=payload, headers=self._headers(), timeout=30)

        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            logger.error(f"[{self.log_prefix}] Error creating/updating file: {exc}")
            logger.error(f"[{self.log_prefix}] Response body: {response.text}")
            if response.status_code in (401, 403):
                raise ValueError(
                    "GitHub API authorization failed. "
                    "Please check that GITHUB_TOKEN is valid and has repository write access."
                )
            raise

        logger.info(
            f"[{self.log_prefix}] {'Updated' if sha else 'Created'} file: {file_path}"
        )
        return response.json()

    def delete_file(self, file_path: str, commit_message: str) -> dict:
        """Delete a file from GitHub."""
        url = self._content_url(file_path)

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

        logger.info(f"[{self.log_prefix}] Deleted file: {file_path}")
        return response.json()


__all__ = ["GitHubContentManager"]
