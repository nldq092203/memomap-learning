"""Database infrastructure - PostgreSQL with SQLAlchemy."""

from src.infra.db.connection import db_session, get_db, engine, SessionLocal
from src.infra.db.orm import (
    Base,
    UserORM,
    UserExerciseProgressORM,
    CoCeExerciseORM,
    DelfTestPaperORM,
)

__all__ = [
    # Connection
    "db_session",
    "get_db",
    "engine",
    "SessionLocal",
    # ORM models
    "Base",
    "UserORM",
    "UserExerciseProgressORM",
    "CoCeExerciseORM",
    "DelfTestPaperORM",
]
