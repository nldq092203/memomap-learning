"""
Learning app configuration.

Contains all settings needed for the Learning backend:
- Flask settings
- Google OAuth
- CORS
- Redis
- PostgreSQL
- Numbers Dictation
- AI settings
"""

import os
from dotenv import load_dotenv


load_dotenv()


class LearningConfig:
    """Learning app configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_WEB_CLIENT_ID = os.getenv("GOOGLE_WEB_CLIENT_ID")
    GOOGLE_EXTENSION_CLIENT_ID = os.getenv("GOOGLE_EXTENSION_CLIENT_ID")
    ALLOWED_REDIRECT_URIS = set((os.getenv("ALLOWED_REDIRECT_URIS") or "").split(","))

    # CORS
    WEB_ORIGIN = os.getenv("WEB_ORIGIN", "http://localhost:3000")
    EXTENSION_ORIGIN = os.getenv("EXTENSION_ORIGIN")
    ALLOWED_ORIGINS = (
        os.getenv("ALLOWED_ORIGINS", "").split(",")
        if os.getenv("ALLOWED_ORIGINS")
        else []
    )
    SECURE_COOKIE = os.getenv("SECURE_COOKIE", "false").lower() == "true"
    GOOGLE_REDIRECT_URI = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://127.0.0.1:5000/api/web/accounts/google/login/callback/",
    )

    # AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    # AI rate limiting
    AI_RATE_USER_PER_MINUTE = int(os.getenv("AI_RATE_USER_PER_MINUTE", "10"))
    AI_RATE_USER_PER_DAY = int(os.getenv("AI_RATE_USER_PER_DAY", "500"))
    AI_RATE_GLOBAL_PER_MINUTE = int(os.getenv("AI_RATE_GLOBAL_PER_MINUTE", "120"))

    # Redis Configuration
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
    REDIS_SSL = os.getenv("REDIS_SSL", "false").lower() == "true"
    REDIS_MAX_CONNECTIONS = int(os.getenv("REDIS_MAX_CONNECTIONS", "50"))
    REDIS_URL = os.getenv("REDIS_URL", None)
    DEFAULT_CACHE_TTL = int(os.getenv("DEFAULT_CACHE_TTL", "3600"))

    # Numbers Dictation
    NUMBERS_ADMIN_TOKEN = os.getenv("NUMBERS_ADMIN_TOKEN")
    NUMBERS_STORE_ROOT = os.getenv("NUMBERS_STORE_ROOT")
    NUMBERS_AUDIO_DIR = os.getenv("NUMBERS_AUDIO_DIR")
    NUMBERS_AUDIO_BASE_URL = os.getenv(
        "NUMBERS_AUDIO_BASE_URL",
        "https://raw.githubusercontent.com/nldq092203/memomap-number-dictation-audio/main/",
    )
    NUMBERS_DATA_LANG = os.getenv("NUMBERS_DATA_LANG", "fr")
    NUMBERS_DATA_VERSION = os.getenv("NUMBERS_DATA_VERSION", "2025-W50")

    # PostgreSQL Configuration
    POSTGRES_DSN = os.getenv("POSTGRES_DSN", None)

    # GitHub API (for CO/CE content management)
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
    GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "nldq092203")
    GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "memomap-audio-fr")



# Alias for backward compatibility
Config = LearningConfig

__all__ = ["LearningConfig", "Config"]
