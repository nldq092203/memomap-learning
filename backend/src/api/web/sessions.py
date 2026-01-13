"""Session API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.schemas import SessionCreateRequest
from src.api.errors import BadRequestError
from src.domain.controllers import (
    create_session_controller,
    list_sessions_controller,
    get_session_controller,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
@with_db
def sessions_list_create(user_id: str, db: Session):
    """GET /web/sessions - List sessions
    POST /web/sessions - Create session"""

    if request.method == "GET":
        language = request.args.get("language", "").strip() or None
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
        day_filter = request.args.get("day")

        data = list_sessions_controller(
            db=db,
            user_id=user_id,
            language=language,
            limit=limit,
            offset=offset,
            day_filter=day_filter,
        )

        return ResponseBuilder().success(data=data).build()

    else:  # POST
        body = request.get_json(silent=True) or {}

        try:
            req = SessionCreateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        data = create_session_controller(
            db=db,
            user_id=user_id,
            language=req.language,
            name=req.name,
            duration_seconds=req.duration_seconds,
            tags=req.tags,
            extra=req.extra,
        )

        return ResponseBuilder().success(data=data, status_code=201).build()


@require_auth
@with_db
def sessions_detail(session_id: str, user_id: str, db: Session):
    """GET /web/sessions/{session_id}"""
    data = get_session_controller(db=db, user_id=user_id, session_id=session_id)
    return ResponseBuilder().success(data=data).build()
