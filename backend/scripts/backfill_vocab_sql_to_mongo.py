#!/usr/bin/env python3
"""Backfill SQL vocabulary cards into MongoDB.

Usage:
    uv run python scripts/backfill_vocab_sql_to_mongo.py
    uv run python scripts/backfill_vocab_sql_to_mongo.py --apply
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.infra.db import db_session
from src.infra.db.orm import VocabularyCardORM
from src.extensions import logger


@dataclass
class BackfillCounts:
    scanned: int = 0
    migrated: int = 0
    skipped: int = 0
    failed: int = 0


def build_mongo_vocab_doc(
    card: VocabularyCardORM, imported_at: datetime
) -> dict[str, Any]:
    """Convert one SQL vocabulary row into the Mongo vocabulary shape."""
    extra = dict(card.extra or {})
    item_type = extra.get("item_type") or (
        "phrase" if " " in card.word.strip() else "word"
    )
    return {
        "user_id": card.user_id,
        "legacy_sql_id": card.id,
        "text": card.word,
        "text_normalized": card.word.casefold(),
        "item_type": item_type,
        "language": card.language,
        "native_language": extra.get("native_language"),
        "translation": card.translation,
        "notes": card.notes or [],
        "examples": extra.get("examples", []),
        "tags": card.tags or [],
        "level": extra.get("level"),
        "source_context": extra.get("source_context", {}),
        "status": card.status,
        "next_due_at": card.due_at,
        "last_reviewed_at": card.last_reviewed_at,
        "interval_days": card.interval_days,
        "ease": card.ease,
        "reps": card.reps,
        "lapses": card.lapses,
        "streak_correct": card.streak_correct,
        "last_grade": card.last_grade,
        "created_at": card.created_at,
        "updated_at": card.updated_at,
        "deleted_at": None,
        "extra": {
            **extra,
            "imported_from_sql_id": card.id,
            "imported_from_sql_at": imported_at,
        },
    }


def _iter_sql_vocab_cards(
    *,
    user_id: str | None = None,
    language: str | None = None,
    limit: int | None = None,
):
    stmt = select(VocabularyCardORM).order_by(
        VocabularyCardORM.user_id,
        VocabularyCardORM.created_at,
    )
    if user_id:
        stmt = stmt.where(VocabularyCardORM.user_id == user_id)
    if language:
        stmt = stmt.where(VocabularyCardORM.language == language)
    if limit:
        stmt = stmt.limit(limit)

    with db_session() as db:
        for card in db.execute(stmt).scalars().all():
            yield card


def _already_imported(collection, card: VocabularyCardORM) -> bool:
    existing = collection.find_one(
        {
            "user_id": card.user_id,
            "$or": [
                {"legacy_sql_id": card.id},
                {"extra.imported_from_sql_id": card.id},
            ],
        },
        {"_id": 1},
    )
    return existing is not None


def backfill_sql_vocab_to_mongo(
    *,
    dry_run: bool = True,
    user_id: str | None = None,
    language: str | None = None,
    limit: int | None = None,
    ensure_indexes: bool = True,
) -> BackfillCounts:
    """Backfill SQL vocabulary rows into MongoDB."""
    counts = BackfillCounts()
    imported_at = datetime.now(timezone.utc)
    logger.info(
        "Starting SQL-to-Mongo vocabulary backfill "
        f"(dry_run={dry_run}, user_id={user_id}, language={language}, limit={limit})"
    )

    collection = None
    if not dry_run:
        from src.infra.mongo import (
            ensure_vocabulary_indexes,
            get_vocab_cards_collection,
        )

        if ensure_indexes:
            ensure_vocabulary_indexes()
        collection = get_vocab_cards_collection()

    for card in _iter_sql_vocab_cards(user_id=user_id, language=language, limit=limit):
        counts.scanned += 1
        try:
            if dry_run:
                logger.info(
                    f"[DRY RUN] Would migrate SQL vocab {card.id} "
                    f"for user {card.user_id}: {card.word}"
                )
                counts.migrated += 1
                continue

            if _already_imported(collection, card):
                logger.info(f"Skipping SQL vocab {card.id} - already imported")
                counts.skipped += 1
                continue

            doc = build_mongo_vocab_doc(card, imported_at)
            collection.insert_one(doc)
            logger.info(f"Migrated SQL vocab {card.id} for user {card.user_id}")
            counts.migrated += 1
        except Exception as exc:
            logger.exception(f"Failed to migrate SQL vocab {card.id}: {exc}")
            counts.failed += 1

    logger.info("=" * 60)
    logger.info("Vocabulary backfill summary")
    logger.info(f"  Scanned: {counts.scanned}")
    logger.info(f"  Migrated: {counts.migrated}")
    logger.info(f"  Skipped: {counts.skipped}")
    logger.info(f"  Failed: {counts.failed}")
    logger.info("=" * 60)
    if dry_run:
        logger.info("Dry run only. Re-run with --apply to write Mongo documents.")
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Backfill SQL vocabulary cards into MongoDB"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write Mongo documents. Default is dry-run.",
    )
    parser.add_argument("--user-id", help="Limit backfill to one user id")
    parser.add_argument("--language", help="Limit backfill to one language")
    parser.add_argument("--limit", type=int, help="Limit number of SQL rows scanned")
    parser.add_argument(
        "--skip-indexes",
        action="store_true",
        help="Do not call ensure_vocabulary_indexes before writing",
    )
    args = parser.parse_args()

    backfill_sql_vocab_to_mongo(
        dry_run=not args.apply,
        user_id=args.user_id,
        language=args.language,
        limit=args.limit,
        ensure_indexes=not args.skip_indexes,
    )


if __name__ == "__main__":
    main()
