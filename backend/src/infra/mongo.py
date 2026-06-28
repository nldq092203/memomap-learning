"""MongoDB connection helpers."""

import os

from pymongo import ASCENDING, DESCENDING, TEXT, MongoClient
from pymongo.collection import Collection
from pymongo.errors import OperationFailure

from src.extensions import logger

# ── Global singleton ──────────────────────────────────────────────
_client: MongoClient | None = None

_DB_NAME = os.getenv("MONGO_DB_NAME", "memomap")


def _get_client() -> MongoClient:
    """Return the global MongoClient, creating it once."""
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI environment variable is not set")
        _client = MongoClient(uri, maxPoolSize=1)
        logger.info("MongoDB client created (pool-size=1, serverless-safe)")
    return _client


def get_db():
    """Return the default Mongo database handle."""
    return _get_client()[_DB_NAME]


def get_feedbacks_collection() -> Collection:
    """Shortcut to the `feedbacks` collection."""
    return get_db()["feedbacks"]


def get_vocab_cards_collection() -> Collection:
    """Shortcut to the `vocab_cards` collection."""
    return get_db()["vocab_cards"]


def get_vocab_reviews_collection() -> Collection:
    """Shortcut to the `vocab_reviews` collection."""
    return get_db()["vocab_reviews"]


def _drop_index_if_exists(collection: Collection, name: str) -> None:
    """Drop an index by name, ignoring the case where it does not exist."""
    try:
        collection.drop_index(name)
        logger.info("Dropped stale index {} on {}", name, collection.name)
    except OperationFailure as exc:
        # code 27 == IndexNotFound; anything else is a real error.
        if exc.code != 27:
            raise


def ensure_vocabulary_indexes() -> None:
    """Create Mongo indexes required by the vocabulary repository."""
    cards = get_vocab_cards_collection()
    reviews = get_vocab_reviews_collection()

    cards.create_index(
        [
            ("user_id", ASCENDING),
            ("language", ASCENDING),
            ("status", ASCENDING),
            ("next_due_at", ASCENDING),
        ],
        name="ix_vocab_cards_due_queue",
    )
    cards.create_index(
        [
            ("user_id", ASCENDING),
            ("language", ASCENDING),
            ("text_normalized", ASCENDING),
        ],
        name="ix_vocab_cards_user_text",
    )
    cards.create_index(
        [("user_id", ASCENDING), ("tags", ASCENDING)],
        name="ix_vocab_cards_user_tags",
    )
    cards.create_index(
        [("user_id", ASCENDING), ("source_context.exercise_id", ASCENDING)],
        name="ix_vocab_cards_user_source_exercise",
    )
    cards.create_index(
        [("user_id", ASCENDING), ("updated_at", DESCENDING)],
        name="ix_vocab_cards_user_updated",
    )
    # Drop any pre-existing definition: a compound `sparse` unique index does
    # NOT skip documents where only `legacy_sql_id` is null (user_id is always
    # present), so every new card with `legacy_sql_id: null` collides. Replace
    # it with a partial index scoped to legacy-imported docs only.
    _drop_index_if_exists(cards, "uq_vocab_cards_user_legacy_sql_id")
    cards.create_index(
        [("user_id", ASCENDING), ("legacy_sql_id", ASCENDING)],
        name="uq_vocab_cards_user_legacy_sql_id",
        unique=True,
        partialFilterExpression={"legacy_sql_id": {"$type": "string"}},
    )
    cards.create_index(
        [
            ("text", TEXT),
            ("translation", TEXT),
            ("notes", TEXT),
            ("examples.text", TEXT),
        ],
        name="ix_vocab_cards_text_search",
        default_language="none",
    )

    reviews.create_index(
        [
            ("user_id", ASCENDING),
            ("card_id", ASCENDING),
            ("reviewed_at", DESCENDING),
        ],
        name="ix_vocab_reviews_user_card_reviewed",
    )
    reviews.create_index(
        [("user_id", ASCENDING), ("reviewed_at", DESCENDING)],
        name="ix_vocab_reviews_user_reviewed",
    )
