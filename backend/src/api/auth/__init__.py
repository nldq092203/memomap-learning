"""
Authentication endpoints (Auth API).

These routes are used by both the Web App (`/api/web/*`) and the Chrome
Extension (`/api/ext/*`) to:
- Exchange a Google OAuth token for an application JWT
- Verify JWT validity
- Fetch the current authenticated user
- Perform any one-off per-user initialization

High-level frontend flow:

1. Client completes Google OAuth (Web or Extension) and obtains an
   `id_token` or an `access_token`.
2. Client calls `POST /api/auth/token` with that Google token.
3. Backend verifies the Google token with Google, finds/creates the user,
   and returns an application JWT.
4. Client stores the JWT and sends it in all subsequent API calls:
   `Authorization: Bearer <jwt>`.
"""

from flask import Blueprint, request

from src.api.decorators import require_auth
from src.infra.auth.google_oauth import (
    verify_google_access_token,
    verify_google_id_token,
)
from src.infra.auth.jwt import create_jwt, decode_jwt
from src.infra.db import db_session
from src.domain.db_queries import UserQueries
from src.utils.response_builder import ResponseBuilder
from src.extensions import logger

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/token", methods=["POST"])
def create_token():
    """
    POST /auth/token

    Exchange a **Google OAuth token** for an application **JWT**.
    This is the entry point for both Web App and Chrome Extension after
    they complete Google sign-in.

    Authentication:
    - This endpoint is **public** (no JWT required).
    - It expects a valid Google `id_token` or `access_token` in the body.

    Request JSON (one of the two must be provided):
    ```json
    {
      "id_token": "google_id_token",          // preferred for Web
      "access_token": "google_access_token"   // optional alternative
    }
    ```

    Frontend guidelines:
    - Web App:
      - Use Google Identity Services / OAuth 2.0 to get an **ID token**.
      - Call `/api/auth/token` with `{"id_token": "<id_token>"}`.
    - Chrome Extension:
      - Use `chrome.identity.getAuthToken()` or extension OAuth flow to
        get an **access token** (with `email` scope).
      - Call `/api/auth/token` with `{"access_token": "<access_token>"}`.

    Behavior:
    - The backend verifies the Google token via Google's `tokeninfo` API:
      - Signature + expiry
      - Audience (`aud`) matches configured client IDs
      - Extracts `email` and `sub` from the token.
    - If verification fails:
      - Returns `401` with `message="Invalid Google ID token"` or
        `"Invalid Google access token"`.
    - If no token is provided:
      - Returns `400` with
        `message="id_token or access_token required"`.
    - On success:
      - Looks up the user by email; if not found, creates one and stores
        Google metadata in `user.extra`:
        - `google_sub`
        - `google_email_verified`
        - `google_iss`
        - `google_aud`
      - Issues a JWT with:
        - `sub`: internal user_id
        - `email`: user email

    Successful response:
    ```json
    {
      "status": "success",
      "data": {
        "token": "<jwt>",
        "user_id": "uuid-string",
        "email": "user@example.com"
      }
    }
    ```

    Error responses (shape):
    ```json
    {
      "status": "error",
      "message": "Human-readable message"
    }
    ```
    """
    body = request.get_json(silent=True) or {}

    id_token = body.get("id_token")
    access_token = body.get("access_token")

    google_user = None

    if id_token:
        google_user = verify_google_id_token(id_token)
        if not google_user:
            return (
                ResponseBuilder()
                .error(
                    message="Invalid Google ID token",
                    status_code=401,
                )
                .build()
            )
    elif access_token:
        google_user = verify_google_access_token(access_token)
        if not google_user:
            return (
                ResponseBuilder()
                .error(
                    message="Invalid Google access token",
                    status_code=401,
                )
                .build()
            )
    else:
        return (
            ResponseBuilder()
            .error(
                message="id_token or access_token required",
                status_code=400,
            )
            .build()
        )

    email = google_user.get("email")
    sub = google_user.get("sub")

    # Ensure user exists in DB
    with db_session() as db:
        user = UserQueries.get_by_email(db, email) if email else None
        if not user:
            extra = {
                "google_sub": google_user.get("sub"),
                "google_email_verified": google_user.get("email_verified"),
                "google_iss": google_user.get("iss"),
                "google_aud": google_user.get("aud"),
            }

            user = UserQueries.create(db, email=email, extra=extra)
            db.commit()
            logger.info(f"[AUTH] Created new user: {email}")

        user_id = user.id
        user_email = user.email

    # Create JWT
    token = create_jwt(
        {
            "sub": user_id,
            "email": user_email,
        }
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "token": token,
                "user_id": user_id,
                "email": user_email,
            }
        )
        .build()
    )


@auth_bp.route("/verify", methods=["GET"])
def verify_token():
    """
    GET /auth/verify

    Verify JWT token from `Authorization` header.

    Authentication:
    - Expects header: `Authorization: Bearer <jwt>`.

    Behavior:
    - Parses the Bearer token.
    - Validates the JWT signature, expiry, and issuer.
    - If invalid or expired:
      - Returns `401` with `message="Invalid or expired token"`.
    - If missing:
      - Returns `401` with `message="No Bearer token provided"`.
    - On success:
      - Returns `{ "valid": true, "user": { ...payload.user... } }`.

    Typical frontend use:
    - At app startup:
      - If a JWT is stored, call `/api/auth/verify`.
      - If `valid: true`, keep the user logged in.
      - If 401 or `valid: false`, treat as logged out and re-run Google
        sign-in + `/auth/token`.

    Successful response example:
    ```json
    {
      "status": "success",
      "data": {
        "valid": true,
        "user": {
          "sub": "internal_user_id",
          "email": "user@example.com"
        }
      }
    }
    ```
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return (
            ResponseBuilder()
            .error(
                message="No Bearer token provided",
                status_code=401,
            )
            .build()
        )

    token = auth_header[7:]
    payload = decode_jwt(token)

    if not payload:
        return (
            ResponseBuilder()
            .error(
                message="Invalid or expired token",
                status_code=401,
            )
            .build()
        )

    return (
        ResponseBuilder()
        .success(data={"valid": True, "user": payload.get("user")})
        .build()
    )


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user(user_id: str):
    """
    GET /auth/me

    Get current authenticated user info.

    Authentication:
    - Requires header: `Authorization: Bearer <jwt>`.
    - The `@require_auth` decorator:
      - Validates the JWT.
      - Injects `user_id` (from JWT `sub`) into the view function.

    Behavior:
    - Loads the user from the database by `user_id`.
    - If not found:
      - Returns `404` with `message="User not found"`.
    - On success:
      - Returns the canonical user identity for the current JWT.

    Typical frontend use:
    - After successful login (`/auth/token`), or
    - On app startup after verifying the token:
      - Call `/api/auth/me` to get the current user profile and store it
        in frontend state/global store.

    Successful response example:
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "uuid-string",
        "email": "user@example.com",
        "created_at": "2024-01-15T10:30:00Z"
      }
    }
    ```
    """
    with db_session() as db:
        user = UserQueries.get_by_id(db, user_id)
        if not user:
            return (
                ResponseBuilder()
                .error(
                    message="User not found",
                    status_code=404,
                )
                .build()
            )

        return (
            ResponseBuilder()
            .success(
                data={
                    "user_id": user.id,
                    "email": user.email,
                    "created_at": (
                        user.created_at.isoformat() if user.created_at else None
                    ),
                }
            )
            .build()
        )


@auth_bp.route("/init", methods=["POST"])
@require_auth
def init_user_space(user_id: str):
    """
    POST /auth/init

    Initialize user space (if needed).

    Authentication:
    - Requires header: `Authorization: Bearer <jwt>`.

    Behavior:
    - Currently a **no-op** because the backend uses PostgreSQL and does
      not need per-user filesystem initialization.
    - Kept for backwards compatibility with older clients / extension.

    Frontend notes:
    - In most cases, you do **not** need to call this explicitly from
      the Web App; `/auth/token` + first data access is enough.
    - If the extension or any legacy client expects an "init" step, it
      can POST to this endpoint once after login.

    Successful response example:
    ```json
    {
      "status": "success",
      "data": {
        "initialized": true,
        "user_id": "uuid-string"
      }
    }
    ```
    """
    return (
        ResponseBuilder()
        .success(data={"initialized": True, "user_id": user_id})
        .build()
    )
