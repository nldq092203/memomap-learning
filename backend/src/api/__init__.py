"""
Learning API - Unified entry point for Web and Chrome Extension.

Blueprints:
- /api/auth/* - Authentication (shared)
- /api/web/* - Full Web API
- /api/ext/* - Limited Extension API
"""

from flask import Blueprint


def create_api_blueprint() -> Blueprint:
    """Create the root API blueprint with all sub-blueprints."""
    from src.api.auth import auth_bp
    from src.api.web import web_bp
    from src.api.ext import ext_bp
    from src.api.errors import register_error_handlers

    api_bp = Blueprint("api", __name__)

    # Register error handlers for the entire API blueprint
    register_error_handlers(api_bp)

    # Auth endpoints (shared by web + extension)
    api_bp.register_blueprint(auth_bp, url_prefix="/auth")

    # Web API (full functionality)
    api_bp.register_blueprint(web_bp, url_prefix="/web")

    # Extension API (limited functionality)
    api_bp.register_blueprint(ext_bp, url_prefix="/ext")

    return api_bp


__all__ = ["create_api_blueprint"]
