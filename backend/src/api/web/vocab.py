"""Vocabulary API endpoints for Web."""

from datetime import datetime, timezone
from typing import Any

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.errors import BadRequestError
from src.api.schemas import VocabCreateRequest, VocabReviewRequest, VocabUpdateRequest
from src.domain.services.srs import MongoSRSService
from src.domain.vocabulary_mongo import MongoVocabularyRepository
from src.utils.response_builder import ResponseBuilder

MONGO_ID_PREFIX = "mongo:"


def _vocab_repository() -> MongoVocabularyRepository:
    return MongoVocabularyRepository()


def _raw_mongo_id(card_id: str) -> str:
    if card_id.startswith(MONGO_ID_PREFIX):
        return card_id[len(MONGO_ID_PREFIX) :]
    return card_id


def _mongo_card_to_web(card: dict[str, Any]) -> dict[str, Any]:
    raw_id = str(card["_id"])
    return {
        "id": f"{MONGO_ID_PREFIX}{raw_id}",
        "raw_id": raw_id,
        "storage": "mongo",
        "user_id": card["user_id"],
        "language": card.get("language"),
        "text": card.get("text"),
        "word": card.get("text"),
        "item_type": card.get("item_type"),
        "translation": card.get("translation"),
        "notes": card.get("notes", []),
        "examples": card.get("examples", []),
        "tags": card.get("tags", []),
        "level": card.get("level"),
        "source_context": card.get("source_context", {}),
        "status": card.get("status"),
        "next_due_at": card.get("next_due_at"),
        "due_at": card.get("next_due_at"),
        "last_reviewed_at": card.get("last_reviewed_at"),
        "interval_days": card.get("interval_days"),
        "ease": card.get("ease"),
        "reps": card.get("reps"),
        "lapses": card.get("lapses"),
        "streak_correct": card.get("streak_correct"),
        "last_grade": card.get("last_grade"),
        "created_at": card.get("created_at"),
        "updated_at": card.get("updated_at"),
        "extra": card.get("extra", {}),
    }


def _mongo_card_updates(updates: dict[str, Any]) -> dict[str, Any]:
    mapped = dict(updates)
    if "word" in mapped:
        mapped["text"] = mapped.pop("word")
    return mapped


def _get_int_query(name: str, default: int) -> int:
    raw = request.args.get(name, str(default))
    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise BadRequestError(f"{name} must be an integer") from exc


@require_auth
@with_db
def vocab_list_create(user_id: str, db: Session):
    """GET/POST /web/vocab."""
    repo = _vocab_repository()

    if request.method == "GET":
        page = repo.list_cards(
            user_id=user_id,
            language=request.args.get("language", "").strip() or None,
            status=request.args.get("status", "").strip() or None,
            search_query=request.args.get("q", "").strip() or None,
            limit=_get_int_query("limit", 50),
            offset=_get_int_query("offset", 0),
        )
        data = {
            **page,
            "items": [_mongo_card_to_web(card) for card in page["items"]],
        }
        return ResponseBuilder().success(data=data).build()

    body = request.get_json(silent=True) or {}
    try:
        req = VocabCreateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    card = repo.create_card(
        user_id=user_id,
        language=req.language,
        text=req.word,
        translation=req.translation,
        notes=req.notes,
        tags=req.tags,
        extra=req.extra,
    )
    return (
        ResponseBuilder()
        .success(data=_mongo_card_to_web(card), status_code=201)
        .build()
    )


@require_auth
@with_db
def vocab_detail(card_id: str, user_id: str, db: Session):
    """GET/PATCH/DELETE /web/vocab/{card_id}."""
    repo = _vocab_repository()
    raw_id = _raw_mongo_id(card_id)

    if request.method == "GET":
        card = repo.get_card(user_id=user_id, card_id=raw_id)
        return ResponseBuilder().success(data=_mongo_card_to_web(card)).build()

    if request.method == "PATCH":
        body = request.get_json(silent=True) or {}
        try:
            req = VocabUpdateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        card = repo.update_card(
            user_id=user_id,
            card_id=raw_id,
            updates=_mongo_card_updates(req.model_dump(exclude_none=True)),
        )
        return ResponseBuilder().success(data=_mongo_card_to_web(card)).build()

    repo.soft_delete_card(user_id=user_id, card_id=raw_id)
    return (
        ResponseBuilder().success(message="Card suspended", data={"ok": True}).build()
    )


@require_auth
@with_db
def vocab_hard_delete(card_id: str, user_id: str, db: Session):
    """DELETE /web/vocab/{card_id}/hard."""
    _vocab_repository().hard_delete_card(
        user_id=user_id,
        card_id=_raw_mongo_id(card_id),
    )
    return (
        ResponseBuilder()
        .success(message="Card deleted permanently", data={"ok": True, "deleted": True})
        .build()
    )


@require_auth
@with_db
def vocab_due(user_id: str, db: Session):
    """GET /web/vocab/due."""
    cards = _vocab_repository().list_due_cards(
        user_id=user_id,
        language=request.args.get("language", "").strip() or None,
        limit=_get_int_query("limit", 20),
    )
    data = {
        "cards": [_mongo_card_to_web(card) for card in cards],
        "count": len(cards),
    }
    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def vocab_review_batch(user_id: str, db: Session):
    """POST /web/vocab:review-batch."""
    body = request.get_json(silent=True) or {}
    try:
        req = VocabReviewRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    reviews = [(_raw_mongo_id(r["card_id"]), r["grade"]) for r in req.reviews]
    result = MongoSRSService(_vocab_repository()).batch_review(reviews, user_id)
    data = {
        **result,
        "cards": [_mongo_card_to_web(card) for card in result["cards"]],
    }
    return ResponseBuilder().success(data=data).build()


@require_auth
@with_db
def vocab_stats(user_id: str, db: Session):
    """GET /web/vocab/stats."""
    language = request.args.get("language", "").strip() or None
    repo = _vocab_repository()
    base_query: dict[str, Any] = {"user_id": user_id, "deleted_at": None}
    if language:
        base_query["language"] = language

    status_counts = {
        status: repo.cards.count_documents({**base_query, "status": status})
        for status in ("new", "learning", "review", "suspended")
    }
    due_today = repo.cards.count_documents(
        {
            **base_query,
            "status": {"$in": ["new", "learning", "review"]},
            "$or": [
                {"next_due_at": None},
                {"next_due_at": {"$lte": datetime.now(timezone.utc)}},
            ],
        }
    )
    data = {
        "language": language,
        "total": repo.cards.count_documents(base_query),
        **status_counts,
        "due_today": due_today,
        "overdue": 0,
        "storage": "mongo",
    }
    return ResponseBuilder().success(data=data).build()
