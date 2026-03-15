"""Google OAuth helpers.

This module owns:
- Google token verification via `tokeninfo`
- Authorization code exchange
- Access token refresh
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import requests

from src.config import Config
from src.extensions import logger


GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DEFAULT_POSTMESSAGE_REDIRECT_URI = "postmessage"


class GoogleOAuthError(RuntimeError):
    """Base error for Google OAuth operations."""


class GoogleOAuthExchangeError(GoogleOAuthError):
    """Authorization code exchange failed."""


class GoogleOAuthRefreshError(GoogleOAuthError):
    """Stored Google refresh token cannot be used anymore."""


def _google_client_ids() -> list[str]:
    """Return the list of allowed Google OAuth client IDs."""
    client_ids: list[str] = []

    if getattr(Config, "GOOGLE_CLIENT_ID", None):
        client_ids.extend(
            cid.strip()
            for cid in str(Config.GOOGLE_CLIENT_ID).split(",")
            if cid.strip()
        )

    if getattr(Config, "GOOGLE_WEB_CLIENT_ID", None):
        client_ids.append(str(Config.GOOGLE_WEB_CLIENT_ID))

    if getattr(Config, "GOOGLE_EXTENSION_CLIENT_ID", None):
        client_ids.append(str(Config.GOOGLE_EXTENSION_CLIENT_ID))

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_ids: list[str] = []
    for cid in client_ids:
        if cid and cid not in seen:
            seen.add(cid)
            unique_ids.append(cid)

    return unique_ids


def _call_tokeninfo(params: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Call Google's tokeninfo endpoint and return the JSON payload."""
    try:
        resp = requests.get(GOOGLE_TOKENINFO_URL, params=params, timeout=5)
    except Exception as exc:  # pragma: no cover - network errors
        logger.error(f"[AUTH] Failed to call Google tokeninfo: {exc}")
        return None

    if resp.status_code != 200:
        logger.warning(
            "[AUTH] Google tokeninfo returned non-200 status",
            status_code=resp.status_code,
            text=resp.text[:200],
        )
        return None

    try:
        data = resp.json()
    except Exception as exc:  # pragma: no cover - unexpected response
        logger.error(f"[AUTH] Failed to parse Google tokeninfo response: {exc}")
        return None

    return data


def _normalize_google_payload(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Validate audience and normalize tokeninfo payload."""
    client_ids = _google_client_ids()
    aud = data.get("aud")

    if client_ids and aud not in client_ids:
        logger.warning(
            "[AUTH] Google token audience mismatch",
            aud=aud,
            expected=client_ids,
        )
        return None

    email = data.get("email")
    sub = data.get("sub")

    if not email or not sub:
        logger.warning(
            "[AUTH] Google token missing required fields",
            has_email=bool(email),
            has_sub=bool(sub),
        )
        return None

    email_verified_raw = data.get("email_verified")
    email_verified = (
        email_verified_raw is True
        or str(email_verified_raw).lower() == "true"
    )

    return {
        "sub": sub,
        "email": email,
        "email_verified": email_verified,
        "iss": data.get("iss"),
        "aud": aud,
    }


def verify_google_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """Verify a Google ID token and return normalized user info."""
    if not id_token:
        return None

    data = _call_tokeninfo({"id_token": id_token})
    if not data:
        return None

    return _normalize_google_payload(data)


def verify_google_access_token(access_token: str) -> Optional[Dict[str, Any]]:
    """Verify a Google OAuth access token and return normalized user info."""
    if not access_token:
        return None

    data = _call_tokeninfo({"access_token": access_token})
    if not data:
        return None

    return _normalize_google_payload(data)


def _call_google_token_endpoint(data: Dict[str, str]) -> Dict[str, Any]:
    try:
        resp = requests.post(
            GOOGLE_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
    except Exception as exc:  # pragma: no cover - network errors
        logger.error(f"[AUTH] Failed to call Google token endpoint: {exc}")
        raise GoogleOAuthError("Failed to reach Google OAuth service") from exc

    payload: Dict[str, Any]
    try:
        payload = resp.json()
    except Exception as exc:  # pragma: no cover - unexpected response
        logger.error(f"[AUTH] Failed to parse Google token response: {exc}")
        raise GoogleOAuthError("Invalid response from Google OAuth service") from exc

    if resp.status_code != 200:
        logger.warning(
            "[AUTH] Google token endpoint returned non-200 status",
            status_code=resp.status_code,
            payload=payload,
        )
        error_message = payload.get("error_description") or payload.get("error") or "Google OAuth request failed"
        raise GoogleOAuthExchangeError(error_message)

    return payload


def exchange_google_auth_code(
    code: str,
    *,
    redirect_uri: str | None = None,
) -> Dict[str, Any]:
    """Exchange a Google authorization code for OAuth tokens."""
    if not code:
        raise GoogleOAuthExchangeError("Authorization code is required")

    client_id = getattr(Config, "GOOGLE_WEB_CLIENT_ID", None) or getattr(Config, "GOOGLE_CLIENT_ID", None)
    client_secret = getattr(Config, "GOOGLE_CLIENT_SECRET", None)
    if not client_id or not client_secret:
        raise GoogleOAuthExchangeError("Google OAuth is not configured")

    return _call_google_token_endpoint(
        {
            "code": code,
            "client_id": str(client_id),
            "client_secret": str(client_secret),
            "redirect_uri": redirect_uri or DEFAULT_POSTMESSAGE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    )


def refresh_google_access_token(refresh_token: str) -> Dict[str, Any]:
    """Use a stored Google refresh token to mint a fresh access token."""
    if not refresh_token:
        raise GoogleOAuthRefreshError("Google refresh token is required")

    client_id = getattr(Config, "GOOGLE_WEB_CLIENT_ID", None) or getattr(Config, "GOOGLE_CLIENT_ID", None)
    client_secret = getattr(Config, "GOOGLE_CLIENT_SECRET", None)
    if not client_id or not client_secret:
        raise GoogleOAuthRefreshError("Google OAuth is not configured")

    try:
        return _call_google_token_endpoint(
            {
                "client_id": str(client_id),
                "client_secret": str(client_secret),
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        )
    except GoogleOAuthExchangeError as exc:
        raise GoogleOAuthRefreshError(str(exc)) from exc


def get_google_user_from_token_response(token_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract normalized user identity from a token exchange response."""
    id_token = token_payload.get("id_token")
    if id_token:
        google_user = verify_google_id_token(id_token)
        if google_user:
            return google_user

    access_token = token_payload.get("access_token")
    if access_token:
        return verify_google_access_token(access_token)

    return None


def build_google_auth_record(
    token_payload: Dict[str, Any],
    *,
    existing_refresh_token: str | None = None,
) -> Dict[str, Any]:
    """Normalize Google OAuth token payload for persistent storage."""
    access_token = token_payload.get("access_token")
    if not access_token:
        raise GoogleOAuthError("Google access token missing from token response")

    expires_in_raw = token_payload.get("expires_in")
    try:
        expires_in = int(expires_in_raw or 0)
    except (TypeError, ValueError):
        expires_in = 0

    refresh_token = token_payload.get("refresh_token") or existing_refresh_token
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(expires_in, 0))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "access_token_expires_at": expires_at.isoformat(),
        "scope": token_payload.get("scope"),
        "token_type": token_payload.get("token_type"),
    }


__all__ = [
    "GoogleOAuthError",
    "GoogleOAuthExchangeError",
    "GoogleOAuthRefreshError",
    "build_google_auth_record",
    "exchange_google_auth_code",
    "get_google_user_from_token_response",
    "refresh_google_access_token",
    "verify_google_access_token",
    "verify_google_id_token",
]
