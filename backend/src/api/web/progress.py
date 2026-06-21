"""Exercise progress API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.errors import BadRequestError
from src.api.schemas import ExerciseProgressUpdateRequest
from src.domain.controllers import (
    get_exercise_progress_controller,
    get_exercise_progress_summary_controller,
    list_exercise_progress_controller,
    update_exercise_progress_controller,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
@with_db
def progress_list_update(user_id: str, db: Session):
    """GET/POST /web/progress."""
    if request.method == "GET":
        status = request.args.get("status", "").strip() or None
        section = request.args.get("section", "").strip() or None
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))

        data = list_exercise_progress_controller(
            db=db,
            user_id=user_id,
            status=status,
            section=section,
            limit=limit,
            offset=offset,
        )
        return ResponseBuilder().success(data=data).build()

    body = request.get_json(silent=True) or {}
    try:
        req = ExerciseProgressUpdateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    data = update_exercise_progress_controller(
        db=db,
        user_id=user_id,
        exercise_id=req.exercise_id,
        section=req.section,
        source_type=req.source_type,
        event=req.event,
        level=req.level,
        status=req.status,
        score=req.score,
        accuracy=req.accuracy,
        saved_vocab_count=req.saved_vocab_count,
        answers_snapshot=req.answers_snapshot,
        extra=req.extra,
    )
    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def progress_detail(exercise_id: str, user_id: str, db: Session):
    """GET /web/progress/<exercise_id>."""
    data = get_exercise_progress_controller(
        db=db,
        user_id=user_id,
        exercise_id=exercise_id,
    )
    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def progress_summary(user_id: str, db: Session):
    """GET /web/progress/summary."""
    data = get_exercise_progress_summary_controller(db=db, user_id=user_id)
    return ResponseBuilder().success(data=data).build()
