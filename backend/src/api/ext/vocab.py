"""Vocabulary API endpoints for Chrome Extension.

Simplified vocabulary endpoints:
- GET /ext/vocab - List vocabulary
- POST /ext/vocab - Create vocabulary
- PUT /ext/vocab/{id} - Update vocabulary
"""

from flask import request

from src.api.decorators import require_auth
from src.api.schemas import VocabCreateRequest, VocabUpdateRequest
from src.api.errors import BadRequestError
from src.domain.vocabulary_mongo import MongoVocabularyRepository
from src.utils.response_builder import ResponseBuilder


MONGO_ID_PREFIX = "mongo:"


def _vocab_repository() -> MongoVocabularyRepository:
    return MongoVocabularyRepository()


def _raw_mongo_id(card_id: str) -> str:
    if card_id.startswith(MONGO_ID_PREFIX):
        return card_id[len(MONGO_ID_PREFIX) :]
    return card_id


def _mongo_card_to_ext(card: dict) -> dict:
    raw_id = str(card["_id"])
    return {
        "id": f"{MONGO_ID_PREFIX}{raw_id}",
        "raw_id": raw_id,
        "storage": "mongo",
        "user_id": card["user_id"],
        "language": card.get("language"),
        "word": card.get("text"),
        "translation": card.get("translation"),
        "notes": card.get("notes", []),
        "tags": card.get("tags", []),
        "status": card.get("status"),
        "due_at": card.get("next_due_at"),
        "last_reviewed_at": card.get("last_reviewed_at"),
        "created_at": card.get("created_at"),
        "updated_at": card.get("updated_at"),
        "extra": card.get("extra", {}),
    }


def _mongo_card_updates(updates: dict) -> dict:
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
def ext_vocab_list(user_id: str):
    """GET /ext/vocab - List vocabulary cards."""
    page = _vocab_repository().list_cards(
        user_id=user_id,
        language=request.args.get("language", "").strip() or None,
        limit=_get_int_query("limit", 50),
        offset=_get_int_query("offset", 0),
    )
    data = {**page, "items": [_mongo_card_to_ext(card) for card in page["items"]]}

    return ResponseBuilder().success(data=data).build()


@require_auth
def ext_vocab_create(user_id: str):
    """POST /ext/vocab - Create vocabulary card."""
    body = request.get_json(silent=True) or {}

    try:
        req = VocabCreateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    card = _vocab_repository().create_card(
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
        .success(data=_mongo_card_to_ext(card), status_code=201)
        .build()
    )


@require_auth
def ext_vocab_update(card_id: str, user_id: str):
    """PUT /ext/vocab/{card_id} - Update vocabulary card."""
    body = request.get_json(silent=True) or {}

    try:
        req = VocabUpdateRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    updates = req.model_dump(exclude_none=True)
    card = _vocab_repository().update_card(
        user_id=user_id,
        card_id=_raw_mongo_id(card_id),
        updates=_mongo_card_updates(updates),
    )

    return ResponseBuilder().success(data=_mongo_card_to_ext(card)).build()
