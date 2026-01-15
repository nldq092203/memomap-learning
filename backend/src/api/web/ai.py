"""AI API endpoints for Web."""

from flask import request

from src.api.decorators import require_auth
from src.api.schemas import AIChatRequest, ExplainTextInput
from src.api.errors import BadRequestError
from src.shared.ai import AIService, enforce_rate_limit
from src.utils.response_builder import ResponseBuilder


@require_auth
def ai_chat(user_id: str):
    """POST /web/ai/chat"""
    body = request.get_json(silent=True) or {}

    try:
        req = AIChatRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    # Rate limiting
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

    # Rate limiting
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
