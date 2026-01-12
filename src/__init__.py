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


def create_app(config_object: type[LearningConfig] | None = None) -> Flask:
    """Create and configure the Learning Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_object or LearningConfig())

    # ---------- CORS ----------
    default_origins = [
        "chrome-extension://*",
        "http://127.0.0.1:*",
        "http://localhost:*",
        "https://localhost:*",
        "https://127.0.0.1:*",
        "http://localhost:3000",
        "http://127.0.0.1:5000",
    ]
    allowed_origins = default_origins + (app.config.get("ALLOWED_ORIGINS", []) or [])
    cors.init_app(app, origins=allowed_origins)

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
