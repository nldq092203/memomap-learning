"""GitHub manager for DELF practice files."""

from __future__ import annotations

import base64
import binascii

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

    def list_files(
        self,
        directory_path: str,
        *,
        extensions: tuple[str, ...] | None = None,
    ) -> list[str]:
        """List filenames in a GitHub directory, optionally filtered by extension.

        Returns sorted bare filenames (no path prefix). A missing directory
        returns an empty list. `extensions` are matched case-insensitively
        and must include the leading dot, e.g. `(".webp", ".png")`.
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

        allowed = (
            tuple(ext.lower() for ext in extensions) if extensions else None
        )
        names: list[str] = []
        for entry in entries:
            if entry.get("type") != "file":
                continue
            name = entry.get("name", "")
            if not name:
                continue
            if allowed is not None and not name.lower().endswith(allowed):
                continue
            names.append(name)
        return sorted(names)

    def list_files_recursive(
        self,
        directory_path: str,
        *,
        extensions: tuple[str, ...] | None = None,
    ) -> list[str]:
        """List files under a GitHub directory recursively.

        Returns paths relative to `directory_path`, e.g. `tp-19/q01/a.webp`.
        A missing directory returns an empty list.
        """
        root = directory_path.strip("/")
        allowed = (
            tuple(ext.lower() for ext in extensions) if extensions else None
        )
        results: list[str] = []

        def walk(path: str, rel_prefix: str = "") -> None:
            response = requests.get(
                self._content_url(path),
                headers=self._headers(),
                timeout=10,
            )
            if response.status_code == 404:
                return
            response.raise_for_status()

            entries = response.json()
            if not isinstance(entries, list):
                return

            for entry in entries:
                name = entry.get("name", "")
                entry_type = entry.get("type")
                if not name:
                    continue
                rel = f"{rel_prefix}{name}"
                if entry_type == "dir":
                    walk(f"{path}/{name}", f"{rel}/")
                    continue
                if entry_type != "file":
                    continue
                if allowed is not None and not name.lower().endswith(allowed):
                    continue
                results.append(rel)

        walk(root)
        return sorted(results)

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

    def read_file(self, file_path: str) -> bytes:
        """Read a GitHub file's raw bytes through the Contents API."""
        response = requests.get(
            self._content_url(file_path),
            headers=self._headers(),
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        encoded = data.get("content", "")
        if not isinstance(encoded, str):
            raise ValueError(f"GitHub response for {file_path} did not include content")
        try:
            return base64.b64decode(encoded.replace("\n", ""), validate=False)
        except (binascii.Error, ValueError) as exc:
            raise ValueError(f"Could not decode GitHub file content for {file_path}") from exc

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
