"""Google OAuth token verification helpers.

This module verifies Google ID tokens and access tokens via Google's
`tokeninfo` endpoint and returns normalized user info.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import requests

from src.config import Config
from src.extensions import logger


GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


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


__all__ = ["verify_google_id_token", "verify_google_access_token"]

