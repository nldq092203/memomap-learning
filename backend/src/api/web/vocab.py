"""Vocabulary API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.schemas import VocabCreateRequest, VocabUpdateRequest, VocabReviewRequest
from src.api.errors import BadRequestError
from src.config import Config
from src.domain.controllers import (
    create_vocab_card_controller,
    list_vocab_cards_controller,
    get_vocab_card_controller,
    update_vocab_card_controller,
    soft_delete_vocab_card_controller,
    hard_delete_vocab_card_controller,
    get_due_vocab_cards_controller,
    review_vocab_cards_controller,
    get_vocab_stats_controller,
)
from src.domain.vocabulary_compat import VocabularyCompatibilityService
from src.utils.response_builder import ResponseBuilder


def _use_vocab_compat() -> bool:
    return getattr(Config, "VOCAB_STORAGE_BACKEND", "sql") == "compat"


def _vocab_compat_service(db: Session) -> VocabularyCompatibilityService:
    return VocabularyCompatibilityService(db=db)


@require_auth
@with_db
def vocab_list_create(user_id: str, db: Session):
    """GET /web/vocab - List vocabulary cards
    POST /web/vocab - Create vocabulary card"""

    if request.method == "GET":
        language = request.args.get("language", "").strip() or None
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        search_query = request.args.get("q", "").strip() or None

        if _use_vocab_compat():
            data = _vocab_compat_service(db).list_cards(
                user_id=user_id,
                language=language,
                limit=limit,
                offset=offset,
                search_query=search_query,
            )
        else:
            data = list_vocab_cards_controller(
                db=db,
                user_id=user_id,
                language=language,
                limit=limit,
                offset=offset,
                search_query=search_query,
            )

        return ResponseBuilder().success(data=data).build()

    else:  # POST
        body = request.get_json(silent=True) or {}

        try:
            req = VocabCreateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        if _use_vocab_compat():
            data = _vocab_compat_service(db).create_card(
                user_id=user_id,
                language=req.language,
                text=req.word,
                translation=req.translation,
                notes=req.notes,
                tags=req.tags,
                extra=req.extra,
            )
        else:
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
def vocab_detail(card_id: str, user_id: str, db: Session):
    """GET/PATCH/DELETE /web/vocab/{card_id}"""

    if request.method == "GET":
        if _use_vocab_compat():
            data = _vocab_compat_service(db).get_card(
                user_id=user_id,
                card_id=card_id,
            )
        else:
            data = get_vocab_card_controller(db=db, user_id=user_id, card_id=card_id)
        return ResponseBuilder().success(data=data).build()

    elif request.method == "PATCH":
        body = request.get_json(silent=True) or {}

        try:
            req = VocabUpdateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        updates = req.model_dump(exclude_none=True)
        if _use_vocab_compat():
            data = _vocab_compat_service(db).update_card(
                user_id=user_id,
                card_id=card_id,
                updates=updates,
            )
        else:
            data = update_vocab_card_controller(
                db=db, user_id=user_id, card_id=card_id, **updates
            )

        return ResponseBuilder().success(data=data).build()

    else:  # DELETE (soft delete)
        if _use_vocab_compat():
            _vocab_compat_service(db).soft_delete_card(
                user_id=user_id,
                card_id=card_id,
            )
        else:
            soft_delete_vocab_card_controller(db=db, user_id=user_id, card_id=card_id)
        return ResponseBuilder().success(
            message="Card suspended", status_code=204
        ).build()


@require_auth
@with_db
def vocab_hard_delete(card_id: str, user_id: str, db: Session):
    """DELETE /web/vocab/{card_id}/hard"""
    if _use_vocab_compat():
        _vocab_compat_service(db).hard_delete_card(
            user_id=user_id,
            card_id=card_id,
        )
    else:
        hard_delete_vocab_card_controller(db=db, user_id=user_id, card_id=card_id)
    return ResponseBuilder().success(
        message="Card deleted permanently", status_code=204
    ).build()


@require_auth
@with_db
def vocab_due(user_id: str, db: Session):
    """GET /web/vocab/due"""
    language = request.args.get("language", "").strip()
    limit = int(request.args.get("limit", 20))

    if _use_vocab_compat():
        data = _vocab_compat_service(db).list_due_cards(
            user_id=user_id,
            language=language,
            limit=limit,
        )
    else:
        data = get_due_vocab_cards_controller(
            db=db, user_id=user_id, language=language, limit=limit
        )

    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def vocab_review_batch(user_id: str, db: Session):
    """POST /web/vocab:review-batch"""
    body = request.get_json(silent=True) or {}

    try:
        req = VocabReviewRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    reviews = [(r["card_id"], r["grade"]) for r in req.reviews]
    if _use_vocab_compat():
        data = _vocab_compat_service(db).review_cards(
            user_id=user_id,
            reviews=reviews,
        )
    else:
        data = review_vocab_cards_controller(db=db, user_id=user_id, reviews=reviews)

    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def vocab_stats(user_id: str, db: Session):
    """GET /web/vocab/stats"""
    language = request.args.get("language", "").strip()
    if _use_vocab_compat():
        data = _vocab_compat_service(db).get_stats(
            user_id=user_id,
            language=language,
        )
    else:
        data = get_vocab_stats_controller(db=db, user_id=user_id, language=language)
    return ResponseBuilder().success(data=data).build()
