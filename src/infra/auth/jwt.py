"""Lightweight HS256 JWT implementation."""

from __future__ import annotations
import base64
import hashlib
import hmac
import json
import time
import typing

from src.config import Config


JWT_SECRET = getattr(Config, "DB_JWT_SECRET", None) or Config.SECRET_KEY
JWT_ALG = "HS256"
JWT_ISS = "memomap-learning"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_jwt(
    user_payload: dict[str, typing.Any],
    *,
    expires_in: int = 3600,
) -> str:
    """
    Create a signed JWT containing the user payload.
    """
    now = int(time.time())
    header = {"alg": JWT_ALG, "typ": "JWT"}
    payload = {
        "iss": JWT_ISS,
        "iat": now,
        "exp": now + int(expires_in),
        "sub": user_payload.get("sub") or user_payload.get("email"),
        "user": user_payload,
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_jwt(token: str) -> dict[str, typing.Any] | None:
    """
    Validate and decode a JWT.
    Returns the payload dict on success, None if invalid/expired.
    """
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError:
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(
        JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()

    try:
        sig = _b64url_decode(sig_b64)
    except Exception:
        return None

    if not hmac.compare_digest(sig, expected_sig):
        return None

    try:
        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None

    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and int(time.time()) > int(exp):
        return None

    iss = payload.get("iss")
    if iss and iss != JWT_ISS:
        return None

    return payload

