"""
MemoMap Learning Backend - Flask application factory.

Clean architecture with:
- PostgreSQL for data persistence
- Redis for caching and chat history
- JWT authentication
"""

import time
import os
from flask import Flask, request, Response

from src.extensions import cors
from src.config import LearningConfig
from src.utils.response_builder import ResponseBuilder


METRICS_TOKEN = os.getenv("METRICS_TOKEN")


def _normalize_origin(origin: str) -> str:
    """Keep origin matching stable across env files and browser headers."""
    return origin.strip().strip("\"'").rstrip("/")


def create_app(config_object: type[LearningConfig] | None = None) -> Flask:
    """Create and configure the Learning Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_object or LearningConfig())

    # ---------- CORS ----------
    default_origins = [
        r"^chrome-extension://.*$",
        r"^http://localhost(:\d+)?$",
        r"^https://localhost(:\d+)?$",
        r"^http://127\.0\.0\.1(:\d+)?$",
        r"^https://127\.0\.0\.1(:\d+)?$",
    ]
    configured_origins = [
        _normalize_origin(origin)
        for origin in (app.config.get("ALLOWED_ORIGINS", []) or [])
        if _normalize_origin(origin)
    ]
    allowed_origins = [*default_origins, *configured_origins]
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": [
                    "Authorization",
                    "Content-Type",
                    "X-Admin-Token",
                    "X-Google-Access-Token",
                ],
                "allow_private_network": True,
            }
        },
    )

    # ---------- Health Check ----------
    @app.get("/api/health")
    def health():
        return ResponseBuilder().success(message="OK").build()

    # ---------- Request Timing ----------
    @app.before_request
    def _start_timer():
        request._start_time = time.time()

    @app.after_request
    def _track_latency(response):
        duration = time.time() - getattr(request, "_start_time", time.time())
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response

    # ---------- API BLUEPRINT ----------
    from src.api import create_api_blueprint

    blp = create_api_blueprint()
    app.register_blueprint(blp, url_prefix="/api")

    return app
