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


    def explain_text_structured(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str | None = None,
        level: str = "beginner",
        target_langs: list[str] | None = None,
        include_synonyms: bool = True,
        include_examples: bool = True,
    ) -> dict[str, Any]:
        """Explain text with structured JSON output."""
        prompt = self._build_explain_prompt_structured(
            text=text,
            learning_lang=learning_lang,
            native_lang=native_lang,
            level=level,
            target_langs=target_langs or [],
            include_synonyms=include_synonyms,
            include_examples=include_examples,
        )

        try:
            raw_response = self._client.call(prompt)
            logger.debug(f"[AI] Structured explain raw response: {raw_response}")

            try:
                # Parse JSON from response
                parsed = AIClient.parse_json_object(raw_response)
                return {"content": parsed, "meta": {"isJson": True}}
            except Exception as e:
                logger.warning(f"[AI] JSON parse failed: {e}, falling back to text")
                return {"content": raw_response, "meta": {"isJson": False}}

        except Exception as e:
            logger.error(f"[AI] Structured explain error: {e}")
            return {
                "content": f"Error: {str(e)}",
                "meta": {"isJson": False, "error": True},
            }

    def _build_explain_prompt_structured(
        self,
        text: str,
        learning_lang: str,
        native_lang: str | None,
        level: str,
        target_langs: list[str],
        include_synonyms: bool,
        include_examples: bool,
    ) -> str:
        """Build prompt for structured explain response."""
        targets = ", ".join(target_langs) if target_langs else ""
        ask_syn = "Suggest 3-5 everyday synonyms (if any)." if include_synonyms else ""
        ask_ex = (
            f"Provide 2 usage examples with {learning_lang} plus translations into the target languages."
            if include_examples
            else ""
        )

        return (
            "You are a supportive language tutor. Be concise and practical.\n"
            f"Learner native language: {native_lang or 'unknown'}; Learning language: {learning_lang}.\n"
            f"Learner level: {level}.\n\n"
            f"Input text (in {learning_lang}):\n{text}\n\n"
            "Tasks:\n"
            f"- Explain the sentence(s) in {learning_lang} with simple wording and context.\n"
            "- Identify register: everyday/common/formal/slang, and if common in daily use.\n"
            + (f"- Provide translations into: {targets}.\n" if targets else "")
            + (f"- {ask_syn}\n" if ask_syn else "")
            + (f"- {ask_ex}\n" if ask_ex else "")
            + "\n"
            "Return ONLY valid JSON with this schema (use ISO codes as keys):\n"
            "{\n"
            '  "detected_language": "fr",\n'
            '  "register": "everyday|common|formal|slang",\n'
            '  "usage": {"everyday": true, "notes": "..."},\n'
            '  "translations": {"en": "...", "vi": "..."},  // include the listed target_langs\n'
            '  "explanations": [{"fr": "...", "notes": ["..."]}],\n'
            '  "synonyms": [{"fr": "...", "notes": "..."}],\n'
            '  "examples": [{"fr": "...", "translations": {"en": "...", "vi": "..."}}],\n'
            '  "notes": ["..."]\n'
            "}"
        )

    def _build_chat_prompt(self, history: list[dict], language: str) -> str:
        lang_name = {"fr": "French", "en": "English"}.get(language, language)

        system = f"""You are a helpful {lang_name} language learning assistant. 
Help users understand vocabulary, grammar, and usage. Be concise and educational."""

        messages = [f"System: {system}"]
        for msg in history[-10:]:  # Last 10 messages
            role = msg["role"].capitalize()
            messages.append(f"{role}: {msg['content']}")

        return "\n\n".join(messages) + "\n\nAssistant:"

