"""
Authentication endpoints (Auth API).

These routes are used by the Web App to:
- Exchange a Google OAuth authorization code for an application JWT
- Verify JWT validity
- Fetch the current authenticated user
- Perform any one-off per-user initialization

High-level frontend flow:

1. Client completes Google OAuth authorization code flow and obtains a
   short-lived `code`.
2. Client calls `POST /api/auth/token` with that code.
3. Backend exchanges the code with Google, stores Google OAuth tokens,
   finds/creates the user, and returns an application JWT.
4. Client stores the JWT and sends it in all subsequent API calls:
   `Authorization: Bearer <jwt>`.
"""

from flask import Blueprint, request

from src.api.decorators import require_auth
from src.infra.auth.google_oauth import (
    build_google_auth_record,
    exchange_google_auth_code,
    get_google_user_from_token_response,
    GoogleOAuthExchangeError,
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

    Exchange a **Google OAuth authorization code** for an application **JWT**.
    The backend also stores the Google access + refresh token pair for
    later Drive refreshes.

    Authentication:
    - This endpoint is **public** (no JWT required).
    - It expects a valid Google `code` in the body.

    Request JSON:
    ```json
    {
      "code": "google_authorization_code"
    }
    ```

    Behavior:
    - Exchanges the code with Google token endpoint.
    - Verifies the returned Google identity.
    - Stores Google OAuth tokens under the user record.
    - If no code is provided:
      - Returns `400` with `message="code required"`.
    - On success:
      - Looks up the user by email; if not found, creates one and stores
        Google metadata in `user.extra`.
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

    code = (body.get("code") or "").strip()
    redirect_uri = (body.get("redirect_uri") or "").strip() or None

    if not code:
        return (
            ResponseBuilder()
            .error(
                message="code required",
                status_code=400,
            )
            .build()
        )

    try:
        google_tokens = exchange_google_auth_code(code, redirect_uri=redirect_uri)
    except GoogleOAuthExchangeError as exc:
        return (
            ResponseBuilder()
            .error(
                message=str(exc) or "Failed to exchange Google authorization code",
                status_code=401,
            )
            .build()
        )

    google_user = get_google_user_from_token_response(google_tokens)
    if not google_user:
        return (
            ResponseBuilder()
            .error(
                message="Invalid Google authorization code",
                status_code=401,
            )
            .build()
        )

    email = google_user.get("email")

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
            logger.info(f"[AUTH] Created new user: {email}")

        existing_refresh_token = UserQueries.get_google_auth(user).get("refresh_token")
        google_auth = build_google_auth_record(
            google_tokens,
            existing_refresh_token=existing_refresh_token,
        )
        if not google_auth.get("refresh_token"):
            return (
                ResponseBuilder()
                .error(
                    message="Google offline access was not granted. Please sign in with Google again.",
                    status_code=401,
                )
                .build()
            )
        UserQueries.update_google_oauth(
            db,
            user,
            google_user=google_user,
            google_auth=google_auth,
        )
        db.commit()

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
