"""Compatibility service for the SQL-to-Mongo vocabulary migration."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from src.domain.errors import ResourceNotFoundError
from src.domain.services.srs import MongoSRSService
from src.domain.vocabulary_mongo import MongoVocabularyRepository
from src.legacy.sql_vocabulary.domain.db_queries import VocabularyQueries
from src.legacy.sql_vocabulary.domain.services.srs import SRSService


MONGO_ID_PREFIX = "mongo:"
SQL_ID_PREFIX = "sql:"


class VocabularyCompatibilityService:
    """Read SQL legacy and Mongo vocab together while writing new cards to Mongo."""

    def __init__(
        self,
        *,
        db: Session,
        mongo_repository: MongoVocabularyRepository | None = None,
    ) -> None:
        self.db = db
        self.mongo_repository = mongo_repository or MongoVocabularyRepository()

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
        """Create new vocabulary in Mongo."""
        card = self.mongo_repository.create_card(
            user_id=user_id,
            text=text,
            language=language,
            item_type=item_type,
            native_language=native_language,
            translation=translation,
            notes=notes,
            examples=examples,
            tags=tags,
            level=level,
            source_context=source_context,
            extra=extra,
        )
        return self._mongo_card_to_unified(card)

    def get_card(self, *, user_id: str, card_id: str) -> dict[str, Any]:
        """Get one card from Mongo or SQL legacy."""
        source, raw_id = self._split_card_id(card_id)
        if source == "mongo":
            return self._mongo_card_to_unified(
                self.mongo_repository.get_card(user_id=user_id, card_id=raw_id)
            )
        if source == "sql":
            return self._get_sql_card(user_id=user_id, card_id=raw_id)

        try:
            return self._mongo_card_to_unified(
                self.mongo_repository.get_card(user_id=user_id, card_id=raw_id)
            )
        except Exception:
            return self._get_sql_card(user_id=user_id, card_id=raw_id)

    def update_card(
        self,
        *,
        user_id: str,
        card_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        """Update Mongo cards through Mongo, and SQL legacy cards through SQL."""
        source, raw_id = self._split_card_id(card_id)
        if source == "mongo":
            return self._mongo_card_to_unified(
                self.mongo_repository.update_card(
                    user_id=user_id,
                    card_id=raw_id,
                    updates=updates,
                )
            )

        if source == "sql":
            return self._update_sql_card(
                user_id=user_id,
                card_id=raw_id,
                updates=updates,
            )

        try:
            return self._mongo_card_to_unified(
                self.mongo_repository.update_card(
                    user_id=user_id,
                    card_id=raw_id,
                    updates=updates,
                )
            )
        except Exception:
            return self._update_sql_card(
                user_id=user_id,
                card_id=raw_id,
                updates=updates,
            )

    def list_cards(
        self,
        *,
        user_id: str,
        language: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        source_exercise_id: str | None = None,
        search_query: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """List Mongo and SQL legacy cards in one bounded response."""
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        fetch_size = min(limit + offset, 200)

        mongo_page = self.mongo_repository.list_cards(
            user_id=user_id,
            language=language,
            status=status,
            tags=tags,
            source_exercise_id=source_exercise_id,
            search_query=search_query,
            limit=fetch_size,
            offset=0,
        )
        sql_cards, sql_total = VocabularyQueries.list_by_user(
            self.db,
            user_id=user_id,
            language=language,
            limit=fetch_size,
            offset=0,
            search_query=search_query,
        )
        sql_items = [
            self._sql_card_to_unified(card)
            for card in sql_cards
            if self._sql_card_matches(
                card,
                status=status,
                tags=tags,
                source_exercise_id=source_exercise_id,
            )
        ]
        mongo_items = [
            self._mongo_card_to_unified(card)
            for card in mongo_page["items"]
        ]

        items = self._sort_cards([*mongo_items, *sql_items])
        sql_filtered_total = (
            len(sql_items)
            if status or tags or source_exercise_id
            else sql_total
        )
        total = int(mongo_page["total"]) + sql_filtered_total
        return {
            "items": items[offset : offset + limit],
            "total": total,
            "limit": limit,
            "offset": offset,
            "sources": {
                "mongo": int(mongo_page["total"]),
                "sql": sql_total,
            },
        }

    def list_due_cards(
        self,
        *,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """List due Mongo and SQL legacy cards together."""
        limit = max(1, min(limit, 100))
        mongo_cards = self.mongo_repository.list_due_cards(
            user_id=user_id,
            language=language,
            limit=limit,
        )
        sql_cards = VocabularyQueries.get_due_cards(
            self.db,
            user_id=user_id,
            language=language,
            limit=limit,
        )
        items = [
            *[self._mongo_card_to_unified(card) for card in mongo_cards],
            *[self._sql_card_to_unified(card) for card in sql_cards],
        ]
        items.sort(key=lambda item: item.get("next_due_at") or "")
        return {
            "cards": items[:limit],
            "count": min(len(items), limit),
            "sources": {
                "mongo": len(mongo_cards),
                "sql": len(sql_cards),
            },
        }

    def review_cards(
        self,
        *,
        user_id: str,
        reviews: list[tuple[str, str]],
    ) -> dict[str, Any]:
        """Review Mongo and SQL legacy cards in one request."""
        mongo_reviews: list[tuple[str, str]] = []
        sql_reviews: list[tuple[str, str]] = []

        for card_id, grade in reviews:
            source, raw_id = self._split_card_id(card_id)
            if source == "sql":
                sql_reviews.append((raw_id, grade))
            elif source == "mongo":
                mongo_reviews.append((raw_id, grade))
            else:
                try:
                    self.mongo_repository.get_card_document(
                        user_id=user_id,
                        card_id=raw_id,
                    )
                    mongo_reviews.append((raw_id, grade))
                except Exception:
                    sql_reviews.append((raw_id, grade))

        mongo_result = MongoSRSService(self.mongo_repository).batch_review(
            mongo_reviews,
            user_id,
        )
        sql_cards = SRSService(self.db).batch_review(sql_reviews, user_id)
        sql_items = [self._sql_card_to_unified(card) for card in sql_cards]
        return {
            "updated_count": mongo_result["updated_count"] + len(sql_items),
            "cards": [*mongo_result["cards"], *sql_items],
            "reviews": mongo_result["reviews"],
            "sources": {
                "mongo": mongo_result["updated_count"],
                "sql": len(sql_items),
            },
        }

    def soft_delete_card(self, *, user_id: str, card_id: str) -> None:
        """Soft delete one Mongo or SQL legacy card."""
        source, raw_id = self._split_card_id(card_id)
        if source == "mongo":
            self.mongo_repository.soft_delete_card(user_id=user_id, card_id=raw_id)
            return
        if source == "sql":
            if not VocabularyQueries.soft_delete(self.db, raw_id, user_id):
                raise ResourceNotFoundError("Vocabulary card not found")
            return

        try:
            self.mongo_repository.soft_delete_card(user_id=user_id, card_id=raw_id)
        except Exception:
            if not VocabularyQueries.soft_delete(self.db, raw_id, user_id):
                raise ResourceNotFoundError("Vocabulary card not found")

    def hard_delete_card(self, *, user_id: str, card_id: str) -> None:
        """Hard delete one Mongo or SQL legacy card."""
        source, raw_id = self._split_card_id(card_id)
        if source == "mongo":
            self.mongo_repository.hard_delete_card(user_id=user_id, card_id=raw_id)
            return
        if source == "sql":
            if not VocabularyQueries.hard_delete(self.db, raw_id, user_id):
                raise ResourceNotFoundError("Vocabulary card not found")
            return

        try:
            self.mongo_repository.hard_delete_card(user_id=user_id, card_id=raw_id)
        except Exception:
            if not VocabularyQueries.hard_delete(self.db, raw_id, user_id):
                raise ResourceNotFoundError("Vocabulary card not found")

    def get_stats(self, *, user_id: str, language: str | None = None) -> dict[str, Any]:
        """Return combined lightweight stats across Mongo and SQL legacy cards."""
        base_query: dict[str, Any] = {"user_id": user_id, "deleted_at": None}
        if language:
            base_query["language"] = language

        mongo_total = self.mongo_repository.cards.count_documents(base_query)
        mongo_status = {
            status: self.mongo_repository.cards.count_documents(
                {**base_query, "status": status}
            )
            for status in ("new", "learning", "review", "suspended")
        }
        mongo_due = self.mongo_repository.cards.count_documents(
            {
                **base_query,
                "status": {"$in": ["new", "learning", "review"]},
                "$or": [
                    {"next_due_at": None},
                    {"next_due_at": {"$lte": datetime.now(timezone.utc)}},
                ],
            }
        )
        sql_stats = VocabularyQueries.get_stats(self.db, user_id, language)
        return {
            "language": language,
            "total": mongo_total + sql_stats["total"],
            "new": mongo_status["new"] + sql_stats["new"],
            "learning": mongo_status["learning"] + sql_stats["learning"],
            "review": mongo_status["review"] + sql_stats["review"],
            "suspended": mongo_status["suspended"] + sql_stats["suspended"],
            "due_today": mongo_due + sql_stats["due_today"],
            "overdue": sql_stats["overdue"],
            "sources": {
                "mongo": {
                    "total": mongo_total,
                    **mongo_status,
                    "due_today": mongo_due,
                },
                "sql": sql_stats,
            },
        }

    def _get_sql_card(self, *, user_id: str, card_id: str) -> dict[str, Any]:
        card = VocabularyQueries.get_by_id(self.db, card_id, user_id)
        if not card:
            raise ResourceNotFoundError("Vocabulary card not found")
        return self._sql_card_to_unified(card)

    def _update_sql_card(
        self,
        *,
        user_id: str,
        card_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        sql_updates = self._mongo_updates_to_sql(updates)
        card = VocabularyQueries.update_content(
            self.db,
            card_id,
            user_id,
            **sql_updates,
        )
        if not card:
            raise ResourceNotFoundError("Vocabulary card not found")
        return self._sql_card_to_unified(card)

    def _mongo_card_to_unified(self, card: dict[str, Any]) -> dict[str, Any]:
        raw_id = card["_id"]
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

    def _sql_card_to_unified(self, card) -> dict[str, Any]:
        extra = card.extra or {}
        source_context = extra.get("source_context", {})
        item_type = extra.get("item_type") or ("phrase" if " " in card.word else "word")
        return {
            "id": f"{SQL_ID_PREFIX}{card.id}",
            "raw_id": card.id,
            "storage": "sql",
            "user_id": card.user_id,
            "language": card.language,
            "text": card.word,
            "word": card.word,
            "item_type": item_type,
            "translation": card.translation,
            "notes": card.notes,
            "examples": extra.get("examples", []),
            "tags": card.tags,
            "level": extra.get("level"),
            "source_context": source_context,
            "status": card.status,
            "next_due_at": _json_time(card.due_at),
            "due_at": card.due_at,
            "last_reviewed_at": card.last_reviewed_at,
            "interval_days": card.interval_days,
            "ease": card.ease,
            "reps": card.reps,
            "lapses": card.lapses,
            "streak_correct": card.streak_correct,
            "last_grade": card.last_grade,
            "created_at": card.created_at,
            "updated_at": card.updated_at,
            "extra": extra,
        }

    def _sql_card_matches(
        self,
        card,
        *,
        status: str | None,
        tags: list[str] | None,
        source_exercise_id: str | None,
    ) -> bool:
        if status and card.status != status:
            return False
        if tags and not set(tags).intersection(set(card.tags or [])):
            return False
        if source_exercise_id:
            source_context = (card.extra or {}).get("source_context", {})
            if source_context.get("exercise_id") != source_exercise_id:
                return False
        return True

    def _sort_cards(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(
            items,
            key=lambda item: _json_time(
                item.get("updated_at") or item.get("created_at")
            )
            or "",
            reverse=True,
        )

    def _split_card_id(self, card_id: str) -> tuple[str | None, str]:
        if card_id.startswith(MONGO_ID_PREFIX):
            return "mongo", card_id[len(MONGO_ID_PREFIX) :]
        if card_id.startswith(SQL_ID_PREFIX):
            return "sql", card_id[len(SQL_ID_PREFIX) :]
        return None, card_id

    def _mongo_updates_to_sql(self, updates: dict[str, Any]) -> dict[str, Any]:
        sql_updates: dict[str, Any] = {}
        if "text" in updates:
            sql_updates["word"] = updates["text"]
        if "word" in updates:
            sql_updates["word"] = updates["word"]
        for key in ("translation", "notes", "tags", "extra"):
            if key in updates:
                sql_updates[key] = updates[key]
        return sql_updates


def _json_time(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


__all__ = ["VocabularyCompatibilityService"]
