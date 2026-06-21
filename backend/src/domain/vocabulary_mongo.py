"""Mongo-backed vocabulary repository for the revamp migration path."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from src.api.errors import BadRequestError, NotFoundError

if TYPE_CHECKING:
    from pymongo.collection import Collection


VALID_ITEM_TYPES = {"word", "phrase"}
VALID_VOCAB_STATUSES = {"new", "learning", "review", "suspended"}
VALID_REVIEW_GRADES = {"again", "hard", "good", "easy"}


def serialize_vocab_card(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a Mongo vocabulary card document to a JSON-safe dict."""
    payload = dict(doc)
    payload["_id"] = str(payload["_id"])
    for key in (
        "created_at",
        "updated_at",
        "next_due_at",
        "last_reviewed_at",
        "deleted_at",
    ):
        if isinstance(payload.get(key), datetime):
            payload[key] = payload[key].isoformat()
    return payload


def serialize_vocab_review(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a Mongo vocabulary review document to a JSON-safe dict."""
    payload = dict(doc)
    payload["_id"] = str(payload["_id"])
    payload["card_id"] = str(payload["card_id"])
    if isinstance(payload.get("reviewed_at"), datetime):
        payload["reviewed_at"] = payload["reviewed_at"].isoformat()
    for state_key in ("previous_state", "next_state"):
        if isinstance(payload.get(state_key), dict):
            payload[state_key] = _json_safe_state(payload[state_key])
    return payload


class MongoVocabularyRepository:
    """User-scoped MongoDB operations for vocabulary cards."""

    def __init__(
        self,
        *,
        cards_collection: "Collection" | None = None,
        reviews_collection: "Collection" | None = None,
    ) -> None:
        if cards_collection is None or reviews_collection is None:
            from src.infra.mongo import (
                get_vocab_cards_collection,
                get_vocab_reviews_collection,
            )

        self.cards = cards_collection or get_vocab_cards_collection()
        self.reviews = reviews_collection or get_vocab_reviews_collection()

    def create_card(
        self,
        *,
        user_id: str,
        text: str,
        language: str = "fr",
        item_type: str = "word",
        native_language: str | None = None,
        translation: str | None = None,
        notes: list[str] | None = None,
        examples: list[dict[str, Any]] | None = None,
        tags: list[str] | None = None,
        level: str | None = None,
        source_context: dict[str, Any] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now = _now()
        normalized_text = _normalize_text(text)
        doc = {
            "user_id": user_id,
            "text": _require_text(text),
            "text_normalized": normalized_text,
            "item_type": _normalize_item_type(item_type),
            "language": _normalize_language(language),
            "native_language": _clean_string(native_language),
            "translation": _clean_string(translation),
            "notes": _clean_string_list(notes),
            "examples": _clean_examples(examples),
            "tags": _clean_string_list(tags),
            "level": _clean_string(level, uppercase=True),
            "source_context": _clean_source_context(source_context),
            "status": "new",
            "next_due_at": now,
            "last_reviewed_at": None,
            "interval_days": 0,
            "ease": 250,
            "reps": 0,
            "lapses": 0,
            "streak_correct": 0,
            "last_grade": None,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
            "extra": extra or {},
        }
        result = self.cards.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_vocab_card(doc)

    def get_card(self, *, user_id: str, card_id: str) -> dict[str, Any]:
        doc = self._get_card_doc(user_id=user_id, card_id=card_id)
        return serialize_vocab_card(doc)

    def get_card_document(self, *, user_id: str, card_id: str) -> dict[str, Any]:
        """Return a raw Mongo card document for backend services."""
        return self._get_card_doc(user_id=user_id, card_id=card_id)

    def update_card(
        self,
        *,
        user_id: str,
        card_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        oid = _object_id(card_id)
        set_updates = self._normalize_card_updates(updates)
        if not set_updates:
            raise BadRequestError("Nothing to update")
        set_updates["updated_at"] = _now()

        doc = self.cards.find_one_and_update(
            {"_id": oid, "user_id": user_id, "deleted_at": None},
            {"$set": set_updates},
            return_document=_return_document_after(),
        )
        if not doc:
            raise NotFoundError("Vocabulary card not found")
        return serialize_vocab_card(doc)

    def soft_delete_card(self, *, user_id: str, card_id: str) -> None:
        oid = _object_id(card_id)
        now = _now()
        result = self.cards.update_one(
            {"_id": oid, "user_id": user_id, "deleted_at": None},
            {
                "$set": {
                    "status": "suspended",
                    "deleted_at": now,
                    "updated_at": now,
                }
            },
        )
        if result.matched_count == 0:
            raise NotFoundError("Vocabulary card not found")

    def hard_delete_card(self, *, user_id: str, card_id: str) -> None:
        oid = _object_id(card_id)
        result = self.cards.delete_one({"_id": oid, "user_id": user_id})
        if result.deleted_count == 0:
            raise NotFoundError("Vocabulary card not found")
        self.reviews.delete_many({"card_id": oid, "user_id": user_id})

    def list_cards(
        self,
        *,
        user_id: str,
        language: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        source_exercise_id: str | None = None,
        search_query: str | None = None,
        include_deleted: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        query = self._build_list_query(
            user_id=user_id,
            language=language,
            status=status,
            tags=tags,
            source_exercise_id=source_exercise_id,
            search_query=search_query,
            include_deleted=include_deleted,
        )
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        total = self.cards.count_documents(query)
        cursor = (
            self.cards.find(query)
            .sort("updated_at", -1)
            .skip(offset)
            .limit(limit)
        )
        return {
            "items": [serialize_vocab_card(doc) for doc in cursor],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    def list_due_cards(
        self,
        *,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
        now: datetime | None = None,
    ) -> list[dict[str, Any]]:
        now = now or _now()
        query: dict[str, Any] = {
            "user_id": user_id,
            "deleted_at": None,
            "status": {"$in": ["new", "learning", "review"]},
            "$or": [
                {"next_due_at": None},
                {"next_due_at": {"$lte": now}},
            ],
        }
        if language:
            query["language"] = _normalize_language(language)

        cursor = (
            self.cards.find(query)
            .sort("next_due_at", 1)
            .limit(max(1, min(limit, 100)))
        )
        return [serialize_vocab_card(doc) for doc in cursor]

    def record_review(
        self,
        *,
        user_id: str,
        card_id: str,
        grade: str,
        next_state: dict[str, Any],
    ) -> dict[str, Any]:
        grade = _normalize_grade(grade)
        card = self._get_card_doc(user_id=user_id, card_id=card_id)
        oid = card["_id"]
        now = _now()

        previous_state = _extract_srs_state(card)
        normalized_next_state = self._normalize_srs_updates(next_state, grade, now)
        updated_card = self.cards.find_one_and_update(
            {"_id": oid, "user_id": user_id, "deleted_at": None},
            {"$set": {**normalized_next_state, "updated_at": now}},
            return_document=_return_document_after(),
        )
        if not updated_card:
            raise NotFoundError("Vocabulary card not found")

        review_doc = {
            "user_id": user_id,
            "card_id": oid,
            "grade": grade,
            "reviewed_at": now,
            "previous_state": previous_state,
            "next_state": _extract_srs_state(updated_card),
        }
        result = self.reviews.insert_one(review_doc)
        review_doc["_id"] = result.inserted_id
        return serialize_vocab_review(review_doc)

    def _get_card_doc(self, *, user_id: str, card_id: str) -> dict[str, Any]:
        oid = _object_id(card_id)
        doc = self.cards.find_one({"_id": oid, "user_id": user_id, "deleted_at": None})
        if not doc:
            raise NotFoundError("Vocabulary card not found")
        return doc

    def _normalize_card_updates(self, updates: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "text",
            "item_type",
            "language",
            "native_language",
            "translation",
            "notes",
            "examples",
            "tags",
            "level",
            "source_context",
            "status",
            "extra",
        }
        normalized: dict[str, Any] = {}
        for key, value in updates.items():
            if key not in allowed or value is None:
                continue
            if key == "text":
                normalized["text"] = _require_text(value)
                normalized["text_normalized"] = _normalize_text(value)
            elif key == "item_type":
                normalized[key] = _normalize_item_type(value)
            elif key == "language":
                normalized[key] = _normalize_language(value)
            elif key in {"native_language", "translation"}:
                normalized[key] = _clean_string(value)
            elif key in {"notes", "tags"}:
                normalized[key] = _clean_string_list(value)
            elif key == "examples":
                normalized[key] = _clean_examples(value)
            elif key == "level":
                normalized[key] = _clean_string(value, uppercase=True)
            elif key == "source_context":
                normalized[key] = _clean_source_context(value)
            elif key == "status":
                normalized[key] = _normalize_status(value)
            elif key == "extra":
                normalized[key] = value if isinstance(value, dict) else {}
        return normalized

    def _build_list_query(
        self,
        *,
        user_id: str,
        language: str | None,
        status: str | None,
        tags: list[str] | None,
        source_exercise_id: str | None,
        search_query: str | None,
        include_deleted: bool,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {"user_id": user_id}
        if not include_deleted:
            query["deleted_at"] = None
        if language:
            query["language"] = _normalize_language(language)
        if status:
            query["status"] = _normalize_status(status)
        cleaned_tags = _clean_string_list(tags)
        if cleaned_tags:
            query["tags"] = {"$in": cleaned_tags}
        if source_exercise_id:
            query["source_context.exercise_id"] = source_exercise_id
        if search_query:
            query["$text"] = {"$search": search_query}
        return query

    def _normalize_srs_updates(
        self,
        next_state: dict[str, Any],
        grade: str,
        reviewed_at: datetime,
    ) -> dict[str, Any]:
        status = _normalize_status(str(next_state.get("status") or "review"))
        return {
            "status": status,
            "next_due_at": next_state.get("next_due_at"),
            "last_reviewed_at": reviewed_at,
            "interval_days": max(0, int(next_state.get("interval_days") or 0)),
            "ease": max(1, int(next_state.get("ease") or 250)),
            "reps": max(0, int(next_state.get("reps") or 0)),
            "lapses": max(0, int(next_state.get("lapses") or 0)),
            "streak_correct": max(0, int(next_state.get("streak_correct") or 0)),
            "last_grade": grade,
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _object_id(value: str) -> Any:
    from bson import ObjectId

    try:
        return ObjectId(value)
    except Exception as exc:
        raise BadRequestError("Invalid vocabulary card ID") from exc


def _return_document_after() -> Any:
    from pymongo import ReturnDocument

    return ReturnDocument.AFTER


def _require_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise BadRequestError("text is required")
    return text


def _normalize_text(value: str) -> str:
    return _require_text(value).casefold()


def _normalize_language(value: str) -> str:
    language = (value or "").strip().lower()
    if not language:
        raise BadRequestError("language is required")
    return language


def _normalize_item_type(value: str) -> str:
    item_type = (value or "").strip().lower()
    if item_type not in VALID_ITEM_TYPES:
        raise BadRequestError("item_type must be word or phrase")
    return item_type


def _normalize_status(value: str) -> str:
    status = (value or "").strip().lower()
    if status not in VALID_VOCAB_STATUSES:
        raise BadRequestError("status must be new, learning, review, or suspended")
    return status


def _normalize_grade(value: str) -> str:
    grade = (value or "").strip().lower()
    if grade not in VALID_REVIEW_GRADES:
        raise BadRequestError("grade must be again, hard, good, or easy")
    return grade


def _clean_string(value: str | None, *, uppercase: bool = False) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    return cleaned.upper() if uppercase else cleaned


def _clean_string_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    cleaned = []
    for value in values:
        item = str(value).strip()
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


def _clean_examples(values: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if not values:
        return []
    examples = []
    for value in values:
        if not isinstance(value, dict):
            continue
        text = _clean_string(value.get("text"))
        if not text:
            continue
        examples.append(
            {
                "text": text,
                "translation": _clean_string(value.get("translation")),
                "source": _clean_string(value.get("source")),
            }
        )
    return examples


def _clean_source_context(value: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    allowed = {
        "section",
        "exercise_id",
        "exercise_title",
        "source_type",
        "source_snippet",
        "book",
        "page",
    }
    return {
        key: value[key]
        for key in allowed
        if key in value and value[key] not in (None, "")
    }


def _extract_srs_state(card: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": card.get("status"),
        "next_due_at": card.get("next_due_at"),
        "last_reviewed_at": card.get("last_reviewed_at"),
        "interval_days": card.get("interval_days"),
        "ease": card.get("ease"),
        "reps": card.get("reps"),
        "lapses": card.get("lapses"),
        "streak_correct": card.get("streak_correct"),
        "last_grade": card.get("last_grade"),
    }


def _json_safe_state(state: dict[str, Any]) -> dict[str, Any]:
    payload = dict(state)
    for key in ("next_due_at", "last_reviewed_at"):
        if isinstance(payload.get(key), datetime):
            payload[key] = payload[key].isoformat()
    return payload


__all__ = [
    "MongoVocabularyRepository",
    "serialize_vocab_card",
    "serialize_vocab_review",
]
