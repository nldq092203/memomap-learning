"""Repository for DELF test paper metadata operations."""

from __future__ import annotations

from sqlalchemy import select
from src.infra.db.orm import DelfTestPaperORM
from src.infra.db.connection import db_session


class DelfTestPaperRepository:
    """Repository for DELF test paper metadata operations."""

    def create(
        self,
        test_id: str,
        level: str,
        variant: str,
        section: str,
        github_path: str,
        exercise_count: int = 0,
        audio_filename: str | None = None,
        status: str = "active",
    ) -> DelfTestPaperORM:
        """Create a new test paper record."""
        with db_session() as db:
            test_paper = DelfTestPaperORM(
                test_id=test_id,
                level=level.upper(),
                variant=variant,
                section=section,
                github_path=github_path,
                exercise_count=exercise_count,
                audio_filename=audio_filename,
                status=status,
            )
            db.add(test_paper)
            db.commit()
            db.refresh(test_paper)
            return test_paper

    def get_by_id(self, paper_id: str) -> DelfTestPaperORM | None:
        """Get test paper by UUID."""
        with db_session() as db:
            stmt = select(DelfTestPaperORM).where(DelfTestPaperORM.id == paper_id)
            return db.execute(stmt).scalar_one_or_none()

    def get_by_test_id(
        self, test_id: str, level: str, variant: str, section: str
    ) -> DelfTestPaperORM | None:
        """Get test paper by composite key."""
        with db_session() as db:
            stmt = (
                select(DelfTestPaperORM)
                .where(DelfTestPaperORM.test_id == test_id)
                .where(DelfTestPaperORM.level == level.upper())
                .where(DelfTestPaperORM.variant == variant)
                .where(DelfTestPaperORM.section == section)
            )
            return db.execute(stmt).scalar_one_or_none()

    def list_by_level(
        self,
        level: str,
        section: str | None = None,
        variant: str | None = None,
        status: str = "active",
    ) -> list[DelfTestPaperORM]:
        """List test papers filtered by level, optionally by section and variant."""
        with db_session() as db:
            stmt = (
                select(DelfTestPaperORM)
                .where(DelfTestPaperORM.level == level.upper())
                .where(DelfTestPaperORM.status == status)
            )
            if section:
                stmt = stmt.where(DelfTestPaperORM.section == section)
            if variant:
                stmt = stmt.where(DelfTestPaperORM.variant == variant)

            stmt = stmt.order_by(DelfTestPaperORM.test_id)
            return list(db.execute(stmt).scalars().all())

    def update(self, paper_id: str, **updates) -> DelfTestPaperORM | None:
        """Update test paper fields."""
        with db_session() as db:
            stmt = select(DelfTestPaperORM).where(DelfTestPaperORM.id == paper_id)
            paper = db.execute(stmt).scalar_one_or_none()

            if not paper:
                return None

            for key, value in updates.items():
                if key == "level" and value:
                    setattr(paper, key, value.upper())
                elif hasattr(paper, key):
                    setattr(paper, key, value)

            db.commit()
            db.refresh(paper)
            return paper

    def delete(self, paper_id: str) -> bool:
        """Delete a test paper."""
        with db_session() as db:
            stmt = select(DelfTestPaperORM).where(DelfTestPaperORM.id == paper_id)
            paper = db.execute(stmt).scalar_one_or_none()

            if not paper:
                return False

            db.delete(paper)
            db.commit()
            return True


__all__ = ["DelfTestPaperRepository"]
