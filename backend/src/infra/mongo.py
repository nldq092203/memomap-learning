"""
MongoDB connection helper for Community Feedback.
"""

import os

from pymongo import MongoClient
from pymongo.collection import Collection

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
