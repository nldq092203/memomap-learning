"""Unified exercise catalog for revamp surfaces."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.db_queries import ExerciseProgressQueries
from src.infra.db.orm import CoCeExerciseORM, DelfTestPaperORM
from src.shared.numbers.blueprints import get_all_number_blueprints

CATALOG_SECTIONS = {"CO", "CE", "PO", "PE"}
CATALOG_SOURCE_TYPES = {
    "numbers",
    "video_podcast",
    "delf_book",
    "oral_prompt",
    "writing_prompt",
}
CATALOG_STATUSES = {
    "not_started",
    "in_progress",
    "completed",
    "retry_suggested",
}
DEFAULT_SPEAKING_TOPICS = [
    "alimentation",
    "collocations",
    "environnement",
    "reseaux_sociaux",
    "sante",
    "technologie",
    "travail",
    "uniforme",
    "vie_privee",
]


@dataclass
class CatalogFilters:
    """Bounded catalog filters from API query params."""

    section: str | None = None
    level: str | None = None
    source_type: str | None = None
    status: str | None = None
    limit: int = 50
    offset: int = 0


@dataclass
class ExerciseCatalogItem:
    """Normalized catalog item."""

    exercise_id: str
    section: str
    source_type: str
    title: str
    level: str | None = None
    duration_seconds: int | None = None
    topic: str | None = None
    route: str | None = None
    detail_endpoint: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    progress: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        progress = self.progress or {}
        status = progress.get("status") or "not_started"
        return {
            "exercise_id": self.exercise_id,
            "section": self.section,
            "source_type": self.source_type,
            "level": self.level,
            "title": self.title,
            "duration_seconds": self.duration_seconds,
            "topic": self.topic,
            "route": self.route,
            "detail_endpoint": self.detail_endpoint,
            "status_for_user": status,
            "score": progress.get("score"),
            "accuracy": progress.get("accuracy"),
            "last_opened_at": self._json_time(progress.get("last_opened_at")),
            "completed_at": self._json_time(progress.get("completed_at")),
            "metadata": self.metadata,
        }

    def _json_time(self, value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()
        if value is None:
            return None
        return str(value)


class CatalogProvider(Protocol):
    """Provider interface for one catalog source."""

    def list_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        """Return source items without user progress."""


class NumberCatalogProvider:
    """Catalog provider for generated number-dictation blueprints."""

    def list_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        if not _matches_static_filters(filters, section="CO", source_type="numbers"):
            return []

        items = []
        for blueprint in get_all_number_blueprints():
            label = blueprint.number_type.value.replace("_", " ").title()
            items.append(
                ExerciseCatalogItem(
                    exercise_id=f"numbers:{blueprint.id}",
                    section="CO",
                    source_type="numbers",
                    title=f"Nombres: {label}",
                    route="/co/nombres",
                    detail_endpoint="/api/web/numbers/sessions",
                    topic=blueprint.number_type.value.lower(),
                    metadata={
                        "blueprint_id": blueprint.id,
                        "difficulty": blueprint.difficulty,
                        "rules": blueprint.rules,
                    },
                )
            )
        return items


class CoCeCatalogProvider:
    """Catalog provider for SQL-backed CO/CE video and podcast exercises."""

    def list_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        if filters.source_type and filters.source_type != "video_podcast":
            return []

        stmt = select(CoCeExerciseORM)
        if filters.level:
            stmt = stmt.where(CoCeExerciseORM.level == filters.level)
        stmt = stmt.order_by(CoCeExerciseORM.level, CoCeExerciseORM.created_at.desc())

        items: list[ExerciseCatalogItem] = []
        for exercise in db.execute(stmt).scalars().all():
            if exercise.co_path and _matches_static_filters(
                filters,
                section="CO",
                source_type="video_podcast",
                level=exercise.level,
            ):
                items.append(_coce_item(exercise, section="CO", question_type="co"))
            if exercise.ce_path and _matches_static_filters(
                filters,
                section="CE",
                source_type="video_podcast",
                level=exercise.level,
            ):
                items.append(_coce_item(exercise, section="CE", question_type="ce"))
        return items


class DelfCatalogProvider:
    """Catalog provider for active SQL-backed DELF test papers."""

    def list_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        if filters.source_type and filters.source_type != "delf_book":
            return []

        stmt = select(DelfTestPaperORM).where(DelfTestPaperORM.status == "active")
        if filters.level:
            stmt = stmt.where(DelfTestPaperORM.level == filters.level)
        stmt = stmt.order_by(
            DelfTestPaperORM.level,
            DelfTestPaperORM.section,
            DelfTestPaperORM.test_id,
        )

        items: list[ExerciseCatalogItem] = []
        for paper in db.execute(stmt).scalars().all():
            section = _normalize_delf_section(paper.section)
            if not section:
                continue
            if not _matches_static_filters(
                filters,
                section=section,
                source_type="delf_book",
                level=paper.level,
            ):
                continue
            items.append(
                ExerciseCatalogItem(
                    exercise_id=(
                        f"delf:{paper.level}:{paper.variant}:{paper.section}:"
                        f"{paper.test_id}"
                    ),
                    section=section,
                    source_type="delf_book",
                    level=paper.level,
                    title=f"DELF {paper.level} {paper.section} {paper.test_id}",
                    route=_delf_route(section),
                    detail_endpoint=(
                        f"/api/web/delf/{paper.level.lower()}/{paper.variant}/"
                        f"{paper.section}/{paper.test_id}"
                    ),
                    metadata={
                        "test_id": paper.test_id,
                        "variant": paper.variant,
                        "paper_section": paper.section,
                        "exercise_count": paper.exercise_count,
                        "audio_filename": paper.audio_filename,
                    },
                )
            )
        return items


class SpeakingCatalogProvider:
    """Catalog provider for PO topic-level entries.

    Catalog listing intentionally does not fetch GitHub content. The high-latency
    manifest/content fetch remains on detail endpoints after the user opens a topic.
    """

    def __init__(self, topic_ids: list[str] | None = None) -> None:
        self.topic_ids = topic_ids or DEFAULT_SPEAKING_TOPICS

    def list_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        if not _matches_static_filters(
            filters,
            section="PO",
            source_type="oral_prompt",
        ):
            return []

        return [
            ExerciseCatalogItem(
                exercise_id=f"speaking:{topic_id}",
                section="PO",
                source_type="oral_prompt",
                title=_title_from_slug(topic_id),
                route="/po/pratique-orale",
                detail_endpoint=f"/api/web/speaking-practice/topics/{topic_id}",
                topic=topic_id,
                metadata={
                    "topic_id": topic_id,
                    "content_strategy": "detail_fetch",
                },
            )
            for topic_id in self.topic_ids
        ]


class ExerciseCatalogService:
    """Build catalog items and merge current-user progress in bulk."""

    def __init__(self, providers: list[CatalogProvider] | None = None) -> None:
        self.providers = providers or [
            NumberCatalogProvider(),
            CoCeCatalogProvider(),
            DelfCatalogProvider(),
            SpeakingCatalogProvider(),
        ]

    def list_catalog(
        self,
        db: Session,
        user_id: str,
        filters: CatalogFilters,
    ) -> dict[str, Any]:
        filters = self._normalize_filters(filters)
        items = self._load_items(db, filters)
        items = self._merge_progress(db, user_id, items)
        items = self._filter_by_status(items, filters.status)

        total = len(items)
        page = items[filters.offset : filters.offset + filters.limit]
        return {
            "items": [item.to_dict() for item in page],
            "total": total,
            "limit": filters.limit,
            "offset": filters.offset,
            "filters": {
                "section": filters.section,
                "level": filters.level,
                "source_type": filters.source_type,
                "status": filters.status,
            },
        }

    def _normalize_filters(self, filters: CatalogFilters) -> CatalogFilters:
        if filters.section:
            filters.section = filters.section.upper()
            if filters.section not in CATALOG_SECTIONS:
                raise ValueError("section must be one of: CO, CE, PO, PE")
        if filters.level:
            filters.level = filters.level.upper()
        if filters.source_type and filters.source_type not in CATALOG_SOURCE_TYPES:
            raise ValueError(
                "source_type must be one of: " + ", ".join(sorted(CATALOG_SOURCE_TYPES))
            )
        if filters.status and filters.status not in CATALOG_STATUSES:
            raise ValueError(
                "status must be one of: " + ", ".join(sorted(CATALOG_STATUSES))
            )

        filters.limit = max(1, min(filters.limit, 100))
        filters.offset = max(0, filters.offset)
        return filters

    def _load_items(
        self,
        db: Session,
        filters: CatalogFilters,
    ) -> list[ExerciseCatalogItem]:
        items: list[ExerciseCatalogItem] = []
        for provider in self.providers:
            items.extend(provider.list_items(db, filters))
        return items

    def _merge_progress(
        self,
        db: Session,
        user_id: str,
        items: list[ExerciseCatalogItem],
    ) -> list[ExerciseCatalogItem]:
        progress_rows = ExerciseProgressQueries.get_many_by_exercise_ids(
            db,
            user_id,
            [item.exercise_id for item in items],
        )
        progress_by_exercise_id = {
            row.exercise_id: {
                "status": row.status,
                "score": row.score,
                "accuracy": row.accuracy,
                "last_opened_at": row.last_opened_at,
                "completed_at": row.completed_at,
            }
            for row in progress_rows
        }
        for item in items:
            item.progress = progress_by_exercise_id.get(item.exercise_id)
        return items

    def _filter_by_status(
        self,
        items: list[ExerciseCatalogItem],
        status: str | None,
    ) -> list[ExerciseCatalogItem]:
        if not status:
            return items
        return [
            item
            for item in items
            if (item.progress or {}).get("status", "not_started") == status
        ]


def _coce_item(
    exercise: CoCeExerciseORM,
    *,
    section: str,
    question_type: str,
) -> ExerciseCatalogItem:
    media_kind = "video" if exercise.media_type == "video" else "audio"
    return ExerciseCatalogItem(
        exercise_id=f"coce:{exercise.id}:{question_type}",
        section=section,
        source_type="video_podcast",
        level=exercise.level,
        title=exercise.name,
        duration_seconds=exercise.duration_seconds,
        topic=exercise.topic,
        route=("/co/videos-podcasts" if section == "CO" else "/ce/videos-podcasts"),
        detail_endpoint=(
            f"/api/web/coce/exercises/{exercise.id}/questions" f"?type={question_type}"
        ),
        metadata={
            "coce_exercise_id": exercise.id,
            "media_id": exercise.media_id,
            "media_type": media_kind,
            "question_type": question_type,
            "transcript_path": exercise.transcript_path,
        },
    )


def _normalize_delf_section(section: str) -> str | None:
    normalized = (
        unicodedata.normalize("NFKD", section.strip().upper())
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    if normalized in CATALOG_SECTIONS:
        return normalized
    if "ORALE" in normalized:
        return "PO"
    if "ECRITE" in normalized:
        return "PE"
    return None


def _delf_route(section: str) -> str:
    if section == "CO":
        return "/co/delf-ecoute"
    if section == "CE":
        return "/ce/delf-lire"
    if section == "PO":
        return "/po/pratique-orale"
    return "/pe"


def _matches_static_filters(
    filters: CatalogFilters,
    *,
    section: str,
    source_type: str,
    level: str | None = None,
) -> bool:
    if filters.section and filters.section != section:
        return False
    if filters.source_type and filters.source_type != source_type:
        return False
    if filters.level and filters.level != level:
        return False
    return True


def _title_from_slug(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


__all__ = [
    "CatalogFilters",
    "CatalogProvider",
    "CoCeCatalogProvider",
    "DelfCatalogProvider",
    "ExerciseCatalogService",
    "NumberCatalogProvider",
    "SpeakingCatalogProvider",
]
