"""AI API endpoints for Chrome Extension.

Simplified AI endpoints:
- POST /ext/ai/explain - Explain text
- POST /ext/ai/chat - Chat with AI
"""

from flask import request

from src.api.decorators import require_auth
from src.api.schemas import AIExplainRequest, AIChatRequest
from src.api.errors import BadRequestError
from src.shared.ai import AIService, enforce_rate_limit
from src.utils.response_builder import ResponseBuilder


@require_auth
def ext_ai_explain(user_id: str):
    """POST /ext/ai/explain - Explain text."""
    body = request.get_json(silent=True) or {}

    try:
        req = AIExplainRequest(**body)
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
    result = ai_service.explain_text(
        text=req.text,
        language=req.language,
        context=req.context,
    )

    return ResponseBuilder().success(data=result).build()


@require_auth
def ext_ai_chat(user_id: str):
    """POST /ext/ai/chat - Chat with AI."""
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
