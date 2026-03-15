"""Analytics service for learning data."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from src.domain.db_queries import SessionQueries, VocabularyQueries


class AnalyticsService:
    """Analytics aggregation service."""

    def __init__(self, db: Session):
        self.db = db

    def get_vocab_stats(self, user_id: str, language: str | None = None) -> dict[str, Any]:
        """Get vocabulary statistics."""
        return VocabularyQueries.get_stats(self.db, user_id, language)

    def get_learning_summary(
        self,
        user_id: str,
        language: str | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get learning analytics summary for recent sessions."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        sessions, _ = SessionQueries.list_by_user(
            db=self.db,
            user_id=user_id,
            language=language,
            limit=1000,
            offset=0,
        )

        filtered_sessions = [s for s in sessions if s.created_at >= start_date]

        sessions_by_day: dict[str, int] = {}
        minutes_by_day: dict[str, int] = {}

        def duration_to_minutes(duration_seconds: int) -> int:
            if duration_seconds <= 0:
                return 0
            # Round any non-zero saved session up to the next minute so
            # analytics stays consistent with the session list UI.
            return (duration_seconds + 59) // 60

        for session in filtered_sessions:
            day_str = session.created_at.strftime("%Y-%m-%d")
            sessions_by_day[day_str] = sessions_by_day.get(day_str, 0) + 1
            minutes = duration_to_minutes(session.duration_seconds)
            minutes_by_day[day_str] = minutes_by_day.get(day_str, 0) + minutes

        total_sessions = len(filtered_sessions)
        total_minutes = sum(
            duration_to_minutes(s.duration_seconds) for s in filtered_sessions
        )
        avg_minutes_per_day = total_minutes / days if days > 0 else 0

        return {
            "language": language or "all",
            "days": days,
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "avg_minutes_per_day": round(avg_minutes_per_day, 2),
            "sessions_by_day": sessions_by_day,
            "minutes_by_day": minutes_by_day,
        }
