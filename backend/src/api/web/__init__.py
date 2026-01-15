"""
Web API Blueprint - Full Learning API.

Provides all learning endpoints for web application:
- Sessions
- Transcripts
- Vocabulary (with SRS)
- Analytics
- AI
- Numbers Dictation
"""

from flask import Blueprint

from src.api.web.sessions import sessions_list_create, sessions_detail
from src.api.web.transcripts import transcripts_list_create, transcripts_detail
from src.api.web.vocab import (
    vocab_list_create,
    vocab_detail,
    vocab_hard_delete,
    vocab_due,
    vocab_review_batch,
    vocab_stats,
)
from src.api.web.analytics import analytics_summary
from src.api.web.ai import ai_chat, web_ai_assist
from src.api.web.numbers import (
    numbers_create_session,
    numbers_get_next_exercise,
    numbers_submit_answer,
    numbers_get_summary,
    numbers_audio_stream,
)
from src.api.web.numbers_admin import (
    numbers_admin_generate,
    numbers_admin_list,
    numbers_admin_cleanup_manifest,
)
from src.api.web.audio_lessons import (
    audio_lessons_list,
    audio_lesson_transcript,
    audio_lesson_stream,
    audio_lesson_create,
    audio_lesson_generate_tts,
    audio_lesson_generate_conversation_tts,
    audio_lesson_save_questions,
)
from src.api.web.speaking_practice import (
    speaking_practice_create,
    speaking_practice_list_topics,
    speaking_practice_get_manifest,
    speaking_practice_get_content,
    speaking_practice_stream_audio,
)
from src.api.web.coce_practice import (
    coce_list_exercises,
    coce_get_exercise,
    coce_get_transcript,
    coce_get_questions,
)
from src.api.errors import register_error_handlers


# Web blueprint
web_bp = Blueprint("web", __name__)
register_error_handlers(web_bp)

# ==================== Sessions ====================
web_bp.add_url_rule(
    "/sessions",
    view_func=sessions_list_create,
    methods=["GET", "POST"],
)
web_bp.add_url_rule(
    "/sessions/<session_id>",
    view_func=sessions_detail,
    methods=["GET"],
)

# ==================== Transcripts ====================
web_bp.add_url_rule(
    "/transcripts",
    view_func=transcripts_list_create,
    methods=["GET", "POST"],
)
web_bp.add_url_rule(
    "/transcripts/<transcript_id>",
    view_func=transcripts_detail,
    methods=["GET", "PUT", "DELETE"],
)

# ==================== Vocabulary ====================
web_bp.add_url_rule(
    "/vocab",
    view_func=vocab_list_create,
    methods=["GET", "POST"],
)
web_bp.add_url_rule(
    "/vocab/<card_id>",
    view_func=vocab_detail,
    methods=["GET", "PATCH", "DELETE"],
)
web_bp.add_url_rule(
    "/vocab/<card_id>/hard",
    view_func=vocab_hard_delete,
    methods=["DELETE"],
)
web_bp.add_url_rule(
    "/vocab/due",
    view_func=vocab_due,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/vocab:review-batch",
    view_func=vocab_review_batch,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/vocab/stats",
    view_func=vocab_stats,
    methods=["GET"],
)

# ==================== Analytics ====================
web_bp.add_url_rule(
    "/analytics",
    view_func=analytics_summary,
    methods=["GET"],
)

# ==================== AI ====================
web_bp.add_url_rule(
    "/ai/chat",
    view_func=ai_chat,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/ai/assist",
    view_func=web_ai_assist,
    methods=["POST"],
)

# ==================== Numbers Dictation ====================
web_bp.add_url_rule(
    "/numbers/sessions",
    view_func=numbers_create_session,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/numbers/sessions/<session_id>/next",
    view_func=numbers_get_next_exercise,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/numbers/sessions/<session_id>/answer",
    view_func=numbers_submit_answer,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/numbers/sessions/<session_id>/summary",
    view_func=numbers_get_summary,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/numbers/audio/<path:audio_ref>",
    view_func=numbers_audio_stream,
    methods=["GET"],
)

# ==================== Numbers Dictation (Admin) ====================
web_bp.add_url_rule(
    "/numbers/admin/datasets",
    view_func=numbers_admin_generate,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/numbers/admin/datasets",
    view_func=numbers_admin_list,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/numbers/admin/manifests:cleanup",
    view_func=numbers_admin_cleanup_manifest,
    methods=["POST"],
)

# ==================== Audio Lessons (Drive-backed) ====================
web_bp.add_url_rule(
    "/audio-lessons",
    view_func=audio_lessons_list,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/audio-lessons",
    view_func=audio_lesson_create,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/audio-lessons/tts",
    view_func=audio_lesson_generate_tts,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/audio-lessons/conversation",
    view_func=audio_lesson_generate_conversation_tts,
    methods=["POST"],
)
web_bp.add_url_rule(
    "/audio-lessons/<lesson_id>/transcript",
    view_func=audio_lesson_transcript,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/audio-lessons/<lesson_id>/audio",
    view_func=audio_lesson_stream,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/audio-lessons/<lesson_id>/questions",
    view_func=audio_lesson_save_questions,
    methods=["POST"],
)

# ==================== Speaking Practice ====================
# Create (Drive-backed)
web_bp.add_url_rule(
    "/speaking-practice/sets",
    view_func=speaking_practice_create,
    methods=["POST"],
)

# Retrieval (GitHub-backed)
web_bp.add_url_rule(
    "/speaking-practice/topics",
    view_func=speaking_practice_list_topics,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/speaking-practice/topics/<topic_id>",
    view_func=speaking_practice_get_manifest,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/speaking-practice/content",
    view_func=speaking_practice_get_content,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/speaking-practice/audio",
    view_func=speaking_practice_stream_audio,
    methods=["GET"],
)

# ==================== CO/CE Practice (GitHub-backed) ====================
web_bp.add_url_rule(
    "/coce/exercises",
    view_func=coce_list_exercises,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/coce/exercises/<exercise_id>",
    view_func=coce_get_exercise,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/coce/exercises/<exercise_id>/transcript",
    view_func=coce_get_transcript,
    methods=["GET"],
)
web_bp.add_url_rule(
    "/coce/exercises/<exercise_id>/questions",
    view_func=coce_get_questions,
    methods=["GET"],
)


__all__ = ["web_bp"]
