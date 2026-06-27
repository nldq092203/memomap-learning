"""Archived SQL-backed query helpers for legacy vocabulary flows."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from src.infra.db.orm import VocabularyCardORM


class VocabularyQueries:
    """Database queries for legacy SQL vocabulary cards."""

    @staticmethod
    def create(
        db: Session,
        user_id: str,
        language: str,
        word: str,
        translation: str | None = None,
        notes: list[str] | None = None,
        tags: list[str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> VocabularyCardORM:
        card = VocabularyCardORM(
            id=str(uuid4()),
            user_id=user_id,
            language=language,
            word=word,
            translation=translation,
            notes=notes or [],
            tags=tags or [],
            status="new",
            due_at=datetime.now(timezone.utc),
            interval_days=0,
            ease=250,
            reps=0,
            lapses=0,
            streak_correct=0,
            extra=extra or {},
        )
        db.add(card)
        db.flush()
        return card

    @staticmethod
    def get_by_id(db: Session, card_id: str, user_id: str) -> VocabularyCardORM | None:
        stmt = select(VocabularyCardORM).where(
            and_(
                VocabularyCardORM.id == card_id,
                VocabularyCardORM.user_id == user_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_ids(
        db: Session,
        card_ids: list[str],
        user_id: str,
    ) -> dict[str, VocabularyCardORM]:
        if not card_ids:
            return {}

        stmt = select(VocabularyCardORM).where(
            and_(
                VocabularyCardORM.id.in_(card_ids),
                VocabularyCardORM.user_id == user_id,
            )
        )
        cards = db.execute(stmt).scalars().all()
        return {card.id: card for card in cards}

    @staticmethod
    def list_by_user(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 50,
        offset: int = 0,
        search_query: str | None = None,
    ) -> tuple[list[VocabularyCardORM], int]:
        conditions = [VocabularyCardORM.user_id == user_id]

        if language:
            conditions.append(VocabularyCardORM.language == language)

        if search_query:
            search_pattern = f"%{search_query}%"
            conditions.append(
                or_(
                    VocabularyCardORM.word.ilike(search_pattern),
                    VocabularyCardORM.translation.ilike(search_pattern),
                )
            )

        count_stmt = (
            select(func.count()).select_from(VocabularyCardORM).where(and_(*conditions))
        )
        total = db.execute(count_stmt).scalar_one()

        stmt = (
            select(VocabularyCardORM)
            .where(and_(*conditions))
            .order_by(VocabularyCardORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        cards = list(db.execute(stmt).scalars().all())
        return cards, total

    @staticmethod
    def get_due_cards(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
    ) -> list[VocabularyCardORM]:
        conditions = [
            VocabularyCardORM.user_id == user_id,
            VocabularyCardORM.status.in_(["new", "learning", "review"]),
            or_(
                VocabularyCardORM.due_at.is_(None),
                VocabularyCardORM.due_at <= datetime.now(timezone.utc),
            ),
        ]

        if language:
            conditions.append(VocabularyCardORM.language == language)

        stmt = (
            select(VocabularyCardORM)
            .where(and_(*conditions))
            .order_by(VocabularyCardORM.due_at.asc().nullsfirst())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def update_content(
        db: Session, card_id: str, user_id: str, **updates: Any
    ) -> VocabularyCardORM | None:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return None

        allowed_fields = ["word", "translation", "notes", "tags", "extra"]
        for field, value in updates.items():
            if field in allowed_fields and value is not None:
                setattr(card, field, value)

        card.updated_at = datetime.now(timezone.utc)
        db.flush()
        return card

    @staticmethod
    def soft_delete(db: Session, card_id: str, user_id: str) -> bool:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return False
        card.status = "suspended"
        card.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True

    @staticmethod
    def hard_delete(db: Session, card_id: str, user_id: str) -> bool:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return False
        db.delete(card)
        db.flush()
        return True

    @staticmethod
    def get_stats(
        db: Session, user_id: str, language: str | None = None
    ) -> dict[str, Any]:
        conditions = [VocabularyCardORM.user_id == user_id]
        if language:
            conditions.append(VocabularyCardORM.language == language)

        total_stmt = (
            select(func.count()).select_from(VocabularyCardORM).where(and_(*conditions))
        )
        total = db.execute(total_stmt).scalar_one()

        status_stmt = (
            select(VocabularyCardORM.status, func.count().label("count"))
            .where(and_(*conditions))
            .group_by(VocabularyCardORM.status)
        )
        status_counts = {row.status: row.count for row in db.execute(status_stmt).all()}

        due_conditions = conditions + [
            VocabularyCardORM.status.in_(["new", "learning", "review"]),
            or_(
                VocabularyCardORM.due_at.is_(None),
                VocabularyCardORM.due_at <= datetime.now(timezone.utc),
            ),
        ]
        due_stmt = (
            select(func.count())
            .select_from(VocabularyCardORM)
            .where(and_(*due_conditions))
        )
        due_today = db.execute(due_stmt).scalar_one()

        overdue_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        overdue_conditions = conditions + [
            VocabularyCardORM.status.in_(["learning", "review"]),
            VocabularyCardORM.due_at < overdue_date,
        ]
        overdue_stmt = (
            select(func.count())
            .select_from(VocabularyCardORM)
            .where(and_(*overdue_conditions))
        )
        overdue = db.execute(overdue_stmt).scalar_one()

        return {
            "total": total,
            "new": status_counts.get("new", 0),
            "learning": status_counts.get("learning", 0),
            "review": status_counts.get("review", 0),
            "suspended": status_counts.get("suspended", 0),
            "due_today": due_today,
            "overdue": overdue,
        }
