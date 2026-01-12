"""
Shared features used across the Learning application.

- ai: AI explanation and chat services
- numbers: Numbers dictation engine
"""

from src.shared.ai import AIService, enforce_rate_limit

__all__ = ["AIService", "enforce_rate_limit"]

