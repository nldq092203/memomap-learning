"""Community feedback API endpoints."""

from flask import request

from src.api.decorators import get_current_user, require_auth
from src.domain.community_feedback import CommunityFeedbackService
from src.utils.response_builder import ResponseBuilder


@require_auth
def community_list_create(user_id: str):
    """GET /web/community or POST /web/community."""
    if request.method == "GET":
        feedbacks = CommunityFeedbackService.list_feedbacks()
        return ResponseBuilder().success(data=feedbacks).build()

    body = request.get_json(silent=True) or {}
    user = get_current_user()
    email = user.get("email") or user.get("sub", "")

    feedback = CommunityFeedbackService.create_feedback(
        user_id=user_id,
        email=email,
        content=body.get("content", ""),
    )
    return ResponseBuilder().success(data=feedback, status_code=201).build()


@require_auth
def community_detail(feedback_id: str, user_id: str):
    """PUT /web/community/<feedback_id> or DELETE /web/community/<feedback_id>."""
    if request.method == "PUT":
        body = request.get_json(silent=True) or {}
        feedback = CommunityFeedbackService.update_feedback(
            feedback_id=feedback_id,
            actor_user_id=user_id,
            content=body.get("content"),
            status=body.get("status"),
            can_update_status=False,
        )
        return ResponseBuilder().success(data=feedback).build()

    CommunityFeedbackService.delete_feedback(
        feedback_id=feedback_id,
        actor_user_id=user_id,
    )
    return ResponseBuilder().success(message="Deleted").build()
