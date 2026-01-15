"""Repository for CO/CE exercise metadata operations."""

from __future__ import annotations

from sqlalchemy import select, delete
from src.infra.db.orm import CoCeExerciseORM
from src.infra.db import SessionLocal


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
        db = SessionLocal()
        try:
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
        finally:
            db.close()

    def get_by_id(self, exercise_id: str) -> CoCeExerciseORM | None:
        """Get exercise by ID."""
        db = SessionLocal()
        try:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.id == exercise_id)
            return db.execute(stmt).scalar_one_or_none()
        finally:
            db.close()

    def get_by_level(self, level: str, topic: str | None = None) -> list[CoCeExerciseORM]:
        """Get all exercises for a specific level, optionally filtered by topic, ordered by creation date (newest first)."""
        db = SessionLocal()
        try:
            stmt = (
                select(CoCeExerciseORM)
                .where(CoCeExerciseORM.level == level.upper())
            )
            if topic:
                stmt = stmt.where(CoCeExerciseORM.topic == topic)
            
            stmt = stmt.order_by(CoCeExerciseORM.created_at.desc())
            return list(db.execute(stmt).scalars().all())
        finally:
            db.close()

    def get_all(self) -> list[CoCeExerciseORM]:
        """Get all exercises, ordered by level and creation date."""
        db = SessionLocal()
        try:
            stmt = select(CoCeExerciseORM).order_by(
                CoCeExerciseORM.level, CoCeExerciseORM.created_at.desc()
            )
            return list(db.execute(stmt).scalars().all())
        finally:
            db.close()

    def get_by_media_id(self, media_id: str) -> CoCeExerciseORM | None:
        """Get exercise by media ID (video ID or audio UUID)."""
        db = SessionLocal()
        try:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.media_id == media_id)
            return db.execute(stmt).scalar_one_or_none()
        finally:
            db.close()

    def update_exercise(
        self, exercise_id: str, **updates
    ) -> CoCeExerciseORM | None:
        """Update exercise fields."""
        db = SessionLocal()
        try:
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
        finally:
            db.close()

    def delete_exercise(self, exercise_id: str) -> bool:
        """Delete an exercise."""
        db = SessionLocal()
        try:
            stmt = select(CoCeExerciseORM).where(CoCeExerciseORM.id == exercise_id)
            exercise = db.execute(stmt).scalar_one_or_none()
            
            if not exercise:
                return False

            db.delete(exercise)
            db.commit()
            return True
        finally:
            db.close()


__all__ = ["CoCeExerciseRepository"]
