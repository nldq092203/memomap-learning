"""Vocabulary API endpoints for Chrome Extension.

Simplified vocabulary endpoints:
- GET /ext/vocab - List vocabulary
- POST /ext/vocab - Create vocabulary
- PUT /ext/vocab/{id} - Update vocabulary
"""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.schemas import VocabCreateRequest, VocabUpdateRequest
from src.api.errors import BadRequestError
from src.domain.controllers import (
    create_vocab_card_controller,
    list_vocab_cards_controller,
    update_vocab_card_controller,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
@with_db
def ext_vocab_list(user_id: str, db: Session):
    """GET /ext/vocab - List vocabulary cards."""
    language = request.args.get("language", "").strip() or None
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    data = list_vocab_cards_controller(
        db=db,
        user_id=user_id,
        language=language,
        limit=limit,
        offset=offset,
    )

    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def ext_vocab_create(user_id: str, db: Session):
    """POST /ext/vocab - Create vocabulary card."""
    body = request.get_json(silent=True) or {}

    try:
        req = VocabCreateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    data = create_vocab_card_controller(
        db=db,
        user_id=user_id,
        language=req.language,
        word=req.word,
        translation=req.translation,
        notes=req.notes,
        tags=req.tags,
        extra=req.extra,
    )

    return ResponseBuilder().success(data=data, status_code=201).build()


@require_auth
@with_db
def ext_vocab_update(card_id: str, user_id: str, db: Session):
    """PUT /ext/vocab/{card_id} - Update vocabulary card."""
    body = request.get_json(silent=True) or {}

    try:
        req = VocabUpdateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    updates = req.model_dump(exclude_none=True)
    data = update_vocab_card_controller(
        db=db, user_id=user_id, card_id=card_id, **updates
    )

    return ResponseBuilder().success(data=data).build()
