"""Analytics API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.domain.controllers import get_analytics_summary_controller
from src.utils.response_builder import ResponseBuilder


@require_auth
@with_db
def analytics_summary(user_id: str, db: Session):
    """GET /web/analytics"""
    language = request.args.get("language", "").strip() or None
    days = int(request.args.get("days", 30))

    data = get_analytics_summary_controller(
        db=db,
        user_id=user_id,
        language=language,
        days=days,
    )

    return ResponseBuilder().success(data=data).build()
