"""Community feedback API endpoints."""

from flask import request

from src.api.decorators import get_current_user, require_auth
from src.domain.community_feedback import CommunityFeedbackService
from src.utils.response_builder import ResponseBuilder


def _coerce_optional_bool(value):
    """Coerce request payload values into bool when provided."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    raise ValueError("is_incognito must be a boolean")


@require_auth
def community_list_create(user_id: str):
    """GET /web/community or POST /web/community."""
    if request.method == "GET":
        feedbacks = CommunityFeedbackService.list_feedbacks()
        return ResponseBuilder().success(data=feedbacks).build()

    body = request.get_json(silent=True) or {}
    user = get_current_user()
    email = user.get("email") or user.get("sub", "")
    display_name = user.get("name")
    try:
        is_incognito = _coerce_optional_bool(body.get("is_incognito"))
    except ValueError as exc:
        return ResponseBuilder().error(message=str(exc), status_code=400).build()

    feedback = CommunityFeedbackService.create_feedback(
        user_id=user_id,
        display_name=display_name,
        email=email,
        content=body.get("content", ""),
        is_incognito=bool(is_incognito),
    )
    return ResponseBuilder().success(data=feedback, status_code=201).build()


@require_auth
def community_detail(feedback_id: str, user_id: str):
    """PUT /web/community/<feedback_id> or DELETE /web/community/<feedback_id>."""
    if request.method == "PUT":
        body = request.get_json(silent=True) or {}
        try:
            is_incognito = _coerce_optional_bool(body.get("is_incognito"))
        except ValueError as exc:
            return ResponseBuilder().error(message=str(exc), status_code=400).build()
        feedback = CommunityFeedbackService.update_feedback(
            feedback_id=feedback_id,
            actor_user_id=user_id,
            content=body.get("content"),
            status=body.get("status"),
            is_incognito=is_incognito,
            can_update_status=False,
        )
        return ResponseBuilder().success(data=feedback).build()

    CommunityFeedbackService.delete_feedback(
        feedback_id=feedback_id,
        actor_user_id=user_id,
    )
    return ResponseBuilder().success(message="Deleted").build()
