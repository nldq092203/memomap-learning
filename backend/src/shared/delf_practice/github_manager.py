"""GitHub manager for DELF practice files."""

from __future__ import annotations

import base64

import requests

from src.shared.github_manager import GitHubContentManager


class GitHubDelfManager(GitHubContentManager):
    """Manage DELF practice files in GitHub repository."""

    def __init__(self, github_token: str | None = None):
        super().__init__(github_token, log_prefix="DELF-GITHUB-MANAGER")

    def list_json_stems(self, directory_path: str) -> list[str]:
        """List JSON filename stems in a GitHub directory.

        A missing directory is treated as empty. Other GitHub API failures are
        surfaced because callers use this for overwrite preflight checks.
        """
        response = requests.get(
            self._content_url(directory_path.strip("/")),
            headers=self._headers(),
            timeout=10,
        )
        if response.status_code == 404:
            return []
        response.raise_for_status()

        entries = response.json()
        if not isinstance(entries, list):
            return []

        stems: list[str] = []
        for entry in entries:
            if entry.get("type") != "file":
                continue
            name = entry.get("name", "")
            if name.endswith(".json"):
                stems.append(name[:-5])
        return sorted(stems)

    def file_exists(self, file_path: str) -> bool:
        """Return whether a GitHub file path already exists."""
        response = requests.get(
            self._content_url(file_path),
            headers=self._headers(),
            timeout=10,
        )
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return True

    def create_file(
        self,
        file_path: str,
        content: str | bytes,
        commit_message: str,
    ) -> dict:
        """Create a GitHub file, failing if it already exists."""
        raw_content = content.encode("utf-8") if isinstance(content, str) else content
        payload = {
            "message": commit_message,
            "content": base64.b64encode(raw_content).decode(),
            "branch": self.base_branch,
        }
        response = requests.put(
            self._content_url(file_path),
            json=payload,
            headers=self._headers(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


__all__ = ["GitHubDelfManager"]
