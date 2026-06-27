"""
Domain layer - business logic and data access.

This layer contains:
- controllers: Use case orchestration
- db_queries: Database query helpers
- services: Domain services (SRS, Analytics)
- models: Domain/DTO models
"""

from src.domain.controllers import (
    # Vocabulary
    create_vocab_card_controller,
    list_vocab_cards_controller,
    get_vocab_card_controller,
    update_vocab_card_controller,
    soft_delete_vocab_card_controller,
    hard_delete_vocab_card_controller,
    get_due_vocab_cards_controller,
    review_vocab_cards_controller,
    get_vocab_stats_controller,
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
    VocabularyQueries,
    ExerciseProgressQueries,
)
from src.domain.vocabulary_compat import VocabularyCompatibilityService

__all__ = [
    # Controllers
    "create_vocab_card_controller",
    "list_vocab_cards_controller",
    "get_vocab_card_controller",
    "update_vocab_card_controller",
    "soft_delete_vocab_card_controller",
    "hard_delete_vocab_card_controller",
    "get_due_vocab_cards_controller",
    "review_vocab_cards_controller",
    "get_vocab_stats_controller",
    "update_exercise_progress_controller",
    "get_exercise_progress_controller",
    "list_exercise_progress_controller",
    "get_exercise_progress_summary_controller",
    "list_exercise_catalog_controller",
    # Queries
    "UserQueries",
    "VocabularyQueries",
    "ExerciseProgressQueries",
    "VocabularyCompatibilityService",
]
