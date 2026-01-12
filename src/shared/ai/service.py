"""AI service for text explanation and chat."""

from __future__ import annotations
import json
from typing import Any
from uuid import uuid4

from src.infra.ai import AIClient
from src.infra.cache import get_redis_client
from src.extensions import logger


CHAT_HISTORY_TTL = 12 * 60 * 60  # 12 hours


class AIService:
    """AI service for text explanation and chat."""

    def __init__(self) -> None:
        self._client = AIClient()
        self._redis = get_redis_client()

    def explain_text(
        self,
        text: str,
        language: str = "fr",
        context: str | None = None,
    ) -> dict[str, Any]:
        """Explain text in the given language."""
        prompt = self._build_explain_prompt(text, language, context)

        try:
            response = self._client.call(prompt)
            return {
                "text": text,
                "explanation": response,
                "language": language,
            }
        except Exception as e:
            logger.error(f"[AI] Explain error: {e}")
            return {
                "text": text,
                "explanation": f"Error: {str(e)}",
                "language": language,
                "error": True,
            }

    def chat(
        self,
        user_id: str,
        message: str,
        language: str = "fr",
        conversation_id: str | None = None,
    ) -> dict[str, Any]:
        """Chat with AI, maintaining conversation history in Redis."""
        conv_id = conversation_id or str(uuid4())
        history_key = f"ai:chat:{user_id}:{conv_id}"

        # Get history
        history = self._redis.get_json(history_key) or []

        # Add user message
        history.append({"role": "user", "content": message})

        # Build prompt
        prompt = self._build_chat_prompt(history, language)

        try:
            response = self._client.call(prompt)

            # Add assistant response
            history.append({"role": "assistant", "content": response})

            # Save history
            self._redis.set_json(history_key, history, ex=CHAT_HISTORY_TTL)

            return {
                "conversation_id": conv_id,
                "message": message,
                "response": response,
                "language": language,
            }
        except Exception as e:
            logger.error(f"[AI] Chat error: {e}")
            return {
                "conversation_id": conv_id,
                "message": message,
                "response": f"Error: {str(e)}",
                "language": language,
                "error": True,
            }

    def _build_explain_prompt(
        self,
        text: str,
        language: str,
        context: str | None,
    ) -> str:
        lang_name = {"fr": "French", "en": "English"}.get(language, language)
        ctx_part = f"\nContext: {context}" if context else ""

        return f"""You are a {lang_name} language tutor. Explain the following text clearly.

Text to explain: "{text}"{ctx_part}

Provide:
1. Translation (if not in user's language)
2. Key vocabulary with definitions
3. Grammar notes if relevant
4. Usage examples

Be concise and helpful."""

    def _build_chat_prompt(self, history: list[dict], language: str) -> str:
        lang_name = {"fr": "French", "en": "English"}.get(language, language)

        system = f"""You are a helpful {lang_name} language learning assistant. 
Help users understand vocabulary, grammar, and usage. Be concise and educational."""

        messages = [f"System: {system}"]
        for msg in history[-10:]:  # Last 10 messages
            role = msg["role"].capitalize()
            messages.append(f"{role}: {msg['content']}")

        return "\n\n".join(messages) + "\n\nAssistant:"

