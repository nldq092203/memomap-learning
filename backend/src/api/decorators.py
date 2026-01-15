"""API decorators for authentication and database access."""

from __future__ import annotations

import functools
import typing
from contextlib import contextmanager

from flask import request
from sqlalchemy.orm import Session

from src.api.errors import ForbiddenError, UnauthorizedError
from src.config import Config
from src.infra.auth.jwt import decode_jwt
from src.infra.db.connection import db_session, get_db


def get_bearer_token() -> str | None:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def get_jwt_payload() -> dict[str, typing.Any]:
    """Extract and validate JWT from request."""
    token = get_bearer_token()
    if not token:
        raise UnauthorizedError("No authentication token provided")

    payload = decode_jwt(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    return payload


def get_current_user() -> dict[str, typing.Any]:
    """Get current user info from JWT token."""
    payload = get_jwt_payload()

    user_data = payload.get("user", {})
    if not user_data:
        user_data = {
            "sub": payload.get("sub"),
            "email": payload.get("email") or payload.get("sub"),
        }

    if not user_data.get("sub"):
        raise UnauthorizedError("User ID missing from token")

    return user_data


def require_auth(func):
    """
    Decorator to protect endpoints with JWT authentication.
    Injects 'user_id' into kwargs.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Authenticate request and inject user_id from JWT.
        # Only authentication errors are converted to UnauthorizedError;
        # all other exceptions (e.g. NotFoundError, BadRequestError)
        # bubble up to the normal API error handlers.
        user = get_current_user()
        user_id = user.get("sub")
        kwargs["user_id"] = user_id
        return func(*args, **kwargs)

    return wrapper


def with_db(func):
    """
    Decorator to inject database session.
    Automatically commits on success, rolls back on error.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with db_session() as db:
            kwargs["db"] = db
            result = func(*args, **kwargs)
            db.commit()
            return result

    return wrapper


def require_admin_token(func):
    """
    Decorator for admin-only endpoints (Numbers dataset generation, etc.).

    Requires:
    - Header: X-Admin-Token == Config.NUMBERS_ADMIN_TOKEN
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        expected = getattr(Config, "NUMBERS_ADMIN_TOKEN", None)
        provided = (request.headers.get("X-Admin-Token") or "").strip()

        if not expected:
            raise ForbiddenError("Admin token is not configured")
        if not provided or provided != expected:
            raise ForbiddenError("Invalid admin token")

        return func(*args, **kwargs)

    return wrapper


__all__ = [
    "get_bearer_token",
    "get_jwt_payload",
    "get_current_user",
    "require_auth",
    "require_admin_token",
    "with_db",
]
