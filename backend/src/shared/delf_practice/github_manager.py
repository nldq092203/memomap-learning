"""GitHub manager for DELF practice files."""

from __future__ import annotations

from src.shared.github_manager import GitHubContentManager


class GitHubDelfManager(GitHubContentManager):
    """Manage DELF practice files in GitHub repository."""

    def __init__(self, github_token: str | None = None):
        super().__init__(github_token, log_prefix="DELF-GITHUB-MANAGER")


__all__ = ["GitHubDelfManager"]
