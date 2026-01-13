"""
Domain layer - business logic and data access.

This layer contains:
- controllers: Use case orchestration
- db_queries: Database query helpers
- services: Domain services (SRS, Analytics)
- models: Domain/DTO models
"""

from src.domain.controllers import (
    # Sessions
    create_session_controller,
    list_sessions_controller,
    get_session_controller,
    # Transcripts
    create_transcript_controller,
    list_transcripts_controller,
    get_transcript_controller,
    update_transcript_controller,
    delete_transcript_controller,
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
    # Analytics
    get_analytics_summary_controller,
)

from src.domain.db_queries import (
    UserQueries,
    SessionQueries,
    TranscriptQueries,
    VocabularyQueries,
)

__all__ = [
    # Controllers
    "create_session_controller",
    "list_sessions_controller",
    "get_session_controller",
    "create_transcript_controller",
    "list_transcripts_controller",
    "get_transcript_controller",
    "update_transcript_controller",
    "delete_transcript_controller",
    "create_vocab_card_controller",
    "list_vocab_cards_controller",
    "get_vocab_card_controller",
    "update_vocab_card_controller",
    "soft_delete_vocab_card_controller",
    "hard_delete_vocab_card_controller",
    "get_due_vocab_cards_controller",
    "review_vocab_cards_controller",
    "get_vocab_stats_controller",
    "get_analytics_summary_controller",
    # Queries
    "UserQueries",
    "SessionQueries",
    "TranscriptQueries",
    "VocabularyQueries",
]

