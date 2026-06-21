"""Unified exercise catalog API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.errors import BadRequestError
from src.domain.controllers import list_exercise_catalog_controller
from src.utils.response_builder import ResponseBuilder


def _get_int_query(name: str, default: int) -> int:
    raw = request.args.get(name, str(default))
    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise BadRequestError(f"{name} must be an integer") from exc


@require_auth
@with_db
def catalog_list_exercises(user_id: str, db: Session):
    """GET /web/catalog/exercises."""
    data = list_exercise_catalog_controller(
        db=db,
        user_id=user_id,
        section=request.args.get("section", "").strip() or None,
        level=request.args.get("level", "").strip() or None,
        source_type=request.args.get("source_type", "").strip() or None,
        status=request.args.get("status", "").strip() or None,
        limit=_get_int_query("limit", 50),
        offset=_get_int_query("offset", 0),
    )
    return ResponseBuilder().success(data=data).build()


__all__ = ["catalog_list_exercises"]
