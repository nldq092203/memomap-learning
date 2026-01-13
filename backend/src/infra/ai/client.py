"""Google Gemini AI client."""

from __future__ import annotations
import json
import time
import typing

from google import genai as genai_sdk

from src.config import Config
from src.extensions import logger


class AIClient:
    """Client for interacting with Google Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        temperature: float = 0.5,
        max_tokens: int = 512,
        model_candidates: list[str] | None = None,
    ) -> None:
        self.api_key = api_key or Config.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Gemini API key not provided (set GEMINI_API_KEY)")

        self.model_candidates: list[str] = model_candidates or [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-2.5-pro",
        ]
        self.model = model or self.model_candidates[0]
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._sdk_client = None

        try:
            self._sdk_client = genai_sdk.Client(api_key=self.api_key)
            logger.info("[AIClient] Gemini SDK initialized")
        except Exception as e:
            logger.error(f"[AIClient] Failed to init SDK: {e}")
            raise

    def call(
        self,
        prompt: str,
        model_candidates: list[str] | None = None,
    ) -> str:
        """Generate content using Gemini API."""
        if self._sdk_client is None:
            raise RuntimeError("Gemini SDK not initialized")

        def _extract_text(res: dict) -> str:
            try:
                cands = res.get("candidates") or []
                if not cands:
                    return json.dumps(res)
                parts = (cands[0].get("content") or {}).get("parts") or []
                for p in parts:
                    if isinstance(p, dict) and "text" in p:
                        return p["text"]
                return json.dumps(res)
            except Exception:
                return json.dumps(res)

        candidates = model_candidates or self.model_candidates
        last_error: str | None = None

        for model in candidates:
            for attempt in range(1, 3):
                try:
                    logger.debug(f"[AIClient] model={model} attempt={attempt}")
                    resp = self._sdk_client.models.generate_content(
                        model=model,
                        contents=prompt,
                    )
                    text = getattr(resp, "text", None)
                    if not text:
                        try:
                            text = _extract_text(
                                getattr(resp, "to_dict", lambda: {})()
                            )
                        except Exception:
                            text = str(resp)
                    return text
                except Exception as e:
                    msg = str(e)
                    last_error = msg
                    lowered = msg.lower()
                    is_rate_limit = any(
                        token in lowered
                        for token in ("rate limit", "quota", "exceeded", "429")
                    )
                    if is_rate_limit:
                        logger.warning(
                            f"[AIClient] Rate limit for model={model}, trying next"
                        )
                        break
                    logger.warning(f"[AIClient] Error model={model}: {e}")
                    time.sleep(0.6 * attempt)

        raise RuntimeError(f"Gemini generation failed: {last_error or 'unknown'}")

    @staticmethod
    def parse_json_object(s: str) -> dict:
        """Parse JSON object from AI response."""
        try:
            data = json.loads(s)
        except Exception:
            import re
            m = re.search(r"\{.*\}", s, flags=re.S)
            if not m:
                raise ValueError("AI did not return JSON object")
            data = json.loads(m.group(0))
        if not isinstance(data, dict):
            raise ValueError("AI returned non-object JSON")
        return data

