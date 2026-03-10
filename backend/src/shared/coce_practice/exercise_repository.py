"""Repository for CO/CE exercise metadata operations."""

from __future__ import annotations

from sqlalchemy import select
from src.infra.db.orm import CoCeExerciseORM
from src.infra.db.connection import db_session


class CoCeExerciseRepository:
    """Repository for CO/CE exercise metadata operations."""

    def create_exercise(
        self,
        name: str,
        level: str,
        duration_seconds: int,
        media_id: str,
        media_type: str = "audio",
        topic: str | None = None,
        co_path: str | None = None,
        ce_path: str | None = None,
        transcript_path: str | None = None,
    ) -> CoCeExerciseORM:
        """Create a new exercise record."""
        with db_session() as db:
            exercise = CoCeExerciseORM(
                name=name,
                level=level.upper(),
                duration_seconds=duration_seconds,
                media_id=media_id,
                topic=topic,
                co_path=co_path,
                ce_path=ce_path,
                transcript_path=transcript_path,
            )
            exercise.media_type = media_type

            db.add(exercise)
            db.commit()
            db.refresh(exercise)
            return exercise

    def get_by_id(self, exercise_id: str) -> CoCeExerciseORM | None:
        """Get exercise by ID."""
        with db_session() as db:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.id == exercise_id)
            return db.execute(stmt).scalar_one_or_none()

    def get_by_level(self, level: str, topic: str | None = None) -> list[CoCeExerciseORM]:
        """Get all exercises for a specific level, optionally filtered by topic, ordered by creation date (newest first)."""
        with db_session() as db:
            stmt = (
                select(CoCeExerciseORM)
                .where(CoCeExerciseORM.level == level.upper())
            )
            if topic:
                stmt = stmt.where(CoCeExerciseORM.topic == topic)

            stmt = stmt.order_by(CoCeExerciseORM.created_at.desc())
            return list(db.execute(stmt).scalars().all())

    def get_all(self) -> list[CoCeExerciseORM]:
        """Get all exercises, ordered by level and creation date."""
        with db_session() as db:
            stmt = select(CoCeExerciseORM).order_by(
                CoCeExerciseORM.level, CoCeExerciseORM.created_at.desc()
            )
            return list(db.execute(stmt).scalars().all())

    def get_by_media_id(self, media_id: str) -> CoCeExerciseORM | None:
        """Get exercise by media ID (video ID or audio UUID)."""
        with db_session() as db:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.media_id == media_id)
            return db.execute(stmt).scalar_one_or_none()

    def update_exercise(
        self, exercise_id: str, **updates
    ) -> CoCeExerciseORM | None:
        """Update exercise fields."""
        with db_session() as db:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.id == exercise_id)
            exercise = db.execute(stmt).scalar_one_or_none()

            if not exercise:
                return None

            for key, value in updates.items():
                if key == "media_type":
                    exercise.media_type = value
                elif key == "level" and value:
                    setattr(exercise, key, value.upper())
                elif hasattr(exercise, key):
                    setattr(exercise, key, value)

            db.commit()
            db.refresh(exercise)
            return exercise

    def delete_exercise(self, exercise_id: str) -> bool:
        """Delete an exercise."""
        with db_session() as db:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.id == exercise_id)
            exercise = db.execute(stmt).scalar_one_or_none()

            if not exercise:
                return False

            db.delete(exercise)
            db.commit()
            return True


__all__ = ["CoCeExerciseRepository"]
