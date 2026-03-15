"""AI API endpoints for Web."""

from flask import request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError
from src.api.schemas import (
    AIChatRequest,
    ExplainTextInput,
    QuickExplainRequest,
    DeepBreakdownRequest,
    ExampleGeneratorRequest,
    GrammarCheckRequest,
    MnemonicRequest,
)
from src.shared.ai import AIService, enforce_rate_limit
from src.utils.response_builder import ResponseBuilder


def _check_rate_limit(user_id: str):
    """Check rate limit and return error response if exceeded, else None."""
    rate_info = enforce_rate_limit(user_id)
    if rate_info:
        return (
            ResponseBuilder()
            .error(
                message=f"Rate limit exceeded: {rate_info['scope']}",
                error=rate_info,
                status_code=429,
            )
            .with_headers({"Retry-After": str(rate_info.get("retry_after", 60))})
            .build()
        )
    return None


@require_auth
def ai_chat(user_id: str):
    """POST /web/ai/chat"""
    body = request.get_json(silent=True) or {}

    try:
        req = AIChatRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    ai_service = AIService()
    result = ai_service.chat(
        user_id=user_id,
        message=req.message,
        language=req.language,
        conversation_id=req.conversation_id,
    )

    return ResponseBuilder().success(data=result).build()


@require_auth
def web_ai_assist(user_id: str):
    """POST /web/ai/assist - Structured JSON explanation/translation endpoint."""
    body = request.get_json(silent=True) or {}

    try:
        req = ExplainTextInput(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    ai_service = AIService()
    result = ai_service.explain_text_structured(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
        level=req.level,
        target_langs=req.target_langs,
        include_synonyms=req.include_synonyms,
        include_examples=req.include_examples,
    )

    return ResponseBuilder().success(data=result).build()


@require_auth
def ai_quick_explain(user_id: str):
    """POST /web/ai/quick-explain - Quick word/phrase explanation."""
    body = request.get_json(silent=True) or {}

    try:
        req = QuickExplainRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    result = AIService().quick_explain(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
    )
    return ResponseBuilder().success(data=result).build()


@require_auth
def ai_deep_breakdown(user_id: str):
    """POST /web/ai/deep-breakdown - Deep grammar/nuance analysis."""
    body = request.get_json(silent=True) or {}

    try:
        req = DeepBreakdownRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    result = AIService().deep_breakdown(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
        level=req.level,
    )
    return ResponseBuilder().success(data=result).build()


@require_auth
def ai_generate_examples(user_id: str):
    """POST /web/ai/examples - Generate example sentences."""
    body = request.get_json(silent=True) or {}

    try:
        req = ExampleGeneratorRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    result = AIService().generate_examples(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
        level=req.level,
        count=req.count,
    )
    return ResponseBuilder().success(data=result).build()


@require_auth
def ai_grammar_check(user_id: str):
    """POST /web/ai/grammar-check - Check grammar/spelling errors."""
    body = request.get_json(silent=True) or {}

    try:
        req = GrammarCheckRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    result = AIService().grammar_check(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
    )
    return ResponseBuilder().success(data=result).build()


@require_auth
def ai_create_mnemonic(user_id: str):
    """POST /web/ai/mnemonic - Create memory tricks."""
    body = request.get_json(silent=True) or {}

    try:
        req = MnemonicRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    rate_resp = _check_rate_limit(user_id)
    if rate_resp:
        return rate_resp

    result = AIService().create_mnemonic(
        text=req.text,
        learning_lang=req.learning_lang,
        native_lang=req.native_lang,
    )
    return ResponseBuilder().success(data=result).build()
