"""AI service for text explanation, chat, and specialized learning tasks."""

from __future__ import annotations
import json
from typing import Any
from uuid import uuid4

from src.infra.ai import AIClient
from src.infra.cache import get_redis_client
from src.extensions import logger


CHAT_HISTORY_TTL = 12 * 60 * 60  # 12 hours

# Language display names
_LANG_NAMES = {"fr": "French", "en": "English", "vi": "Vietnamese", "de": "German", "es": "Spanish"}


class AIService:
    """AI service for text explanation, chat, and specialized learning tasks."""

    def __init__(self) -> None:
        self._client = AIClient()
        self._redis = get_redis_client()

    # ──────────────────────────────────────────────
    #  Chat (existing)
    # ──────────────────────────────────────────────

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

    # ──────────────────────────────────────────────
    #  Explain (existing)
    # ──────────────────────────────────────────────

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

    # ──────────────────────────────────────────────
    #  1. Quick Explain
    # ──────────────────────────────────────────────

    def quick_explain(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str = "vi",
    ) -> dict[str, Any]:
        """Quick explanation of a word/phrase: meaning, POS, pronunciation."""
        prompt = self._build_quick_explain_prompt(text, learning_lang, native_lang)
        return self._call_json(prompt, "quick_explain")

    def _build_quick_explain_prompt(
        self, text: str, learning_lang: str, native_lang: str
    ) -> str:
        explain_lang = "Vietnamese" if native_lang == "vi" else "English"
        return (
            f"You are a concise {_LANG_NAMES.get(learning_lang, learning_lang)} dictionary.\n"
            f"Explain in {explain_lang}. Be extremely brief.\n\n"
            f"Word/phrase: {text}\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            f'  "word": "{text}",\n'
            '  "meaning": "...",\n'
            '  "pos": "noun|verb|adj|adv|prep|conj|pron|det|interj|phrase",\n'
            '  "pronunciation": "IPA transcription",\n'
            '  "gender": "m|f|null",\n'
            '  "example": "one short example sentence"\n'
            "}"
        )

    # ──────────────────────────────────────────────
    #  2. Deep Breakdown
    # ──────────────────────────────────────────────

    def deep_breakdown(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str = "vi",
        level: str = "B1",
    ) -> dict[str, Any]:
        """Deep analysis: grammar, nuance, synonyms, DELF usage."""
        prompt = self._build_deep_breakdown_prompt(text, learning_lang, native_lang, level)
        return self._call_json(prompt, "deep_breakdown")

    def _build_deep_breakdown_prompt(
        self, text: str, learning_lang: str, native_lang: str, level: str
    ) -> str:
        explain_lang = "Vietnamese" if native_lang == "vi" else "English"
        lang_name = _LANG_NAMES.get(learning_lang, learning_lang)
        return (
            f"You are an advanced {lang_name} language analyst.\n"
            f"Explain in {explain_lang}. Target level: {level}.\n\n"
            f"Analyze: {text}\n\n"
            "Tasks:\n"
            "- Grammar breakdown (tense, mood, structure)\n"
            "- Register/nuance (formal, informal, literary, spoken)\n"
            "- 3-5 synonyms with nuance differences\n"
            f"- DELF {level} exam usage tips\n"
            "- Common collocations\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            f'  "word": "{text}",\n'
            '  "pronunciation": "IPA",\n'
            '  "pos": "...",\n'
            '  "meaning": "primary meaning",\n'
            '  "grammar": {\n'
            '    "structure": "grammatical structure explanation",\n'
            '    "tense_mood": "tense/mood if applicable",\n'
            '    "notes": ["key grammar points"]\n'
            '  },\n'
            '  "nuance": {\n'
            '    "register": "formal|informal|neutral|literary|spoken",\n'
            '    "frequency": "very common|common|less common|rare",\n'
            '    "notes": "usage nuance"\n'
            '  },\n'
            '  "synonyms": [\n'
            '    {"word": "...", "diff": "how it differs"}\n'
            '  ],\n'
            '  "delf_tips": {\n'
            f'    "level": "{level}",\n'
            '    "usage": "how to use in DELF exam",\n'
            '    "section": "production_orale|production_ecrite|comprehension"\n'
            '  },\n'
            '  "collocations": ["common collocations"],\n'
            '  "examples": [\n'
            '    {"fr": "...", "translation": "..."}\n'
            '  ]\n'
            "}"
        )

    # ──────────────────────────────────────────────
    #  3. Example Generator
    # ──────────────────────────────────────────────

    def generate_examples(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str = "vi",
        level: str = "B1",
        count: int = 3,
    ) -> dict[str, Any]:
        """Generate example sentences based on user's level."""
        prompt = self._build_examples_prompt(text, learning_lang, native_lang, level, count)
        return self._call_json(prompt, "generate_examples")

    def _build_examples_prompt(
        self, text: str, learning_lang: str, native_lang: str, level: str, count: int
    ) -> str:
        explain_lang = "Vietnamese" if native_lang == "vi" else "English"
        lang_name = _LANG_NAMES.get(learning_lang, learning_lang)
        return (
            f"You are a {lang_name} teacher creating example sentences.\n"
            f"Translations in {explain_lang}. Target level: {level}.\n\n"
            f"Create {count} example sentences using: {text}\n\n"
            "Requirements:\n"
            f"- Sentences MUST match {level} difficulty\n"
            "- Use natural, everyday contexts\n"
            "- Include varied sentence structures\n"
            "- Provide translation for each\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            f'  "word": "{text}",\n'
            f'  "level": "{level}",\n'
            '  "examples": [\n'
            '    {\n'
            f'      "{learning_lang}": "sentence in {lang_name}",\n'
            '      "translation": "translated sentence",\n'
            '      "audio_text": "clean text for TTS (no punctuation marks, no special chars)",\n'
            '      "context": "situation/context hint"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

    # ──────────────────────────────────────────────
    #  4. Grammar Check
    # ──────────────────────────────────────────────

    def grammar_check(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str = "vi",
    ) -> dict[str, Any]:
        """Check spelling/grammar errors in user's text (e.g. from dictation)."""
        prompt = self._build_grammar_check_prompt(text, learning_lang, native_lang)
        return self._call_json(prompt, "grammar_check")

    def _build_grammar_check_prompt(
        self, text: str, learning_lang: str, native_lang: str
    ) -> str:
        explain_lang = "Vietnamese" if native_lang == "vi" else "English"
        lang_name = _LANG_NAMES.get(learning_lang, learning_lang)
        return (
            f"You are a {lang_name} grammar checker.\n"
            f"Explain errors in {explain_lang}. Be concise.\n\n"
            f"Check this text:\n{text}\n\n"
            "Find ALL spelling and grammar errors.\n"
            "If text is correct, return empty errors array.\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            '  "original": "the original text",\n'
            '  "corrected": "fully corrected text",\n'
            '  "is_correct": true/false,\n'
            '  "score": 0-100,\n'
            '  "errors": [\n'
            '    {\n'
            '      "text": "the wrong part",\n'
            '      "correction": "the correct version",\n'
            '      "type": "spelling|grammar|accent|conjugation|agreement|punctuation",\n'
            '      "start_index": 0,\n'
            '      "end_index": 5,\n'
            '      "explanation": "why it is wrong"\n'
            '    }\n'
            '  ],\n'
            '  "suggestions": ["general improvement tips"]\n'
            "}"
        )

    # ──────────────────────────────────────────────
    #  5. Mnemonic Creator
    # ──────────────────────────────────────────────

    def create_mnemonic(
        self,
        text: str,
        learning_lang: str = "fr",
        native_lang: str = "vi",
    ) -> dict[str, Any]:
        """Create memory tricks for a word/phrase."""
        prompt = self._build_mnemonic_prompt(text, learning_lang, native_lang)
        return self._call_json(prompt, "create_mnemonic")

    def _build_mnemonic_prompt(
        self, text: str, learning_lang: str, native_lang: str
    ) -> str:
        explain_lang = "Vietnamese" if native_lang == "vi" else "English"
        lang_name = _LANG_NAMES.get(learning_lang, learning_lang)
        return (
            f"You are a creative {lang_name} memory coach.\n"
            f"Create mnemonics in {explain_lang}. Be fun and memorable.\n\n"
            f"Create memory tricks for: {text}\n\n"
            "Use these techniques:\n"
            "- Sound association (word sounds like...)\n"
            "- Visual imagery\n"
            "- Acronym or story\n"
            "- Connection to native language sounds\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            f'  "word": "{text}",\n'
            '  "meaning": "brief meaning",\n'
            '  "mnemonics": [\n'
            '    {\n'
            '      "type": "sound|visual|story|acronym|association",\n'
            '      "trick": "the mnemonic trick",\n'
            '      "explanation": "why it works"\n'
            '    }\n'
            '  ],\n'
            '  "best_pick": "the single best mnemonic, very short"\n'
            "}"
        )

    # ──────────────────────────────────────────────
    #  Private helpers
    # ──────────────────────────────────────────────

    def _call_json(self, prompt: str, task_name: str) -> dict[str, Any]:
        """Call AI and parse JSON response. Common pattern for all specialized tasks."""
        try:
            raw = self._client.call(prompt)
            logger.debug(f"[AI] {task_name} raw: {raw[:200]}")
            try:
                parsed = AIClient.parse_json_object(raw)
                return {"content": parsed, "meta": {"isJson": True, "task": task_name}}
            except Exception as e:
                logger.warning(f"[AI] {task_name} JSON parse failed: {e}")
                return {"content": raw, "meta": {"isJson": False, "task": task_name}}
        except Exception as e:
            logger.error(f"[AI] {task_name} error: {e}")
            return {
                "content": f"Error: {str(e)}",
                "meta": {"isJson": False, "task": task_name, "error": True},
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
