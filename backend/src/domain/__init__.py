"""
Domain layer - business logic and data access.

This layer contains:
- controllers: Use case orchestration
- db_queries: Database query helpers
- services: Domain services (SRS, Analytics)
- models: Domain/DTO models
"""

from src.domain.controllers import (
    # Exercise progress
    update_exercise_progress_controller,
    get_exercise_progress_controller,
    list_exercise_progress_controller,
    get_exercise_progress_summary_controller,
    # Exercise catalog
    list_exercise_catalog_controller,
)

from src.domain.db_queries import (
    UserQueries,
    ExerciseProgressQueries,
)

__all__ = [
    # Controllers
    "update_exercise_progress_controller",
    "get_exercise_progress_controller",
    "list_exercise_progress_controller",
    "get_exercise_progress_summary_controller",
    "list_exercise_catalog_controller",
    # Queries
    "UserQueries",
    "ExerciseProgressQueries",
]
