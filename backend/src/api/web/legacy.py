"""Legacy web API route registration.

These routes remain available during the revamp so existing flows do not
break while the new archive/progress APIs are built. They should not be used
by new revamp features.
"""

from __future__ import annotations

from flask import Blueprint

from src.api.web.analytics import analytics_summary
from src.api.web.audio_lessons import (
    audio_lesson_create,
    audio_lesson_generate_conversation_tts,
    audio_lesson_generate_tts,
    audio_lesson_save_questions,
    audio_lesson_stream,
    audio_lesson_transcript,
    audio_lessons_list,
)
from src.api.web.numbers_admin import (
    numbers_admin_cleanup_manifest,
    numbers_admin_generate,
    numbers_admin_list,
    numbers_admin_mark_guest_preview_manifest,
)
from src.api.web.sessions import sessions_detail, sessions_list_create
from src.api.web.speaking_practice import speaking_practice_create
from src.api.web.transcripts import transcripts_detail, transcripts_list_create


def register_legacy_web_routes(web_bp: Blueprint) -> None:
    """Register web routes that are being sunset by the revamp."""

    # ==================== Sessions (Legacy) ====================
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

    # ==================== Transcripts (Legacy) ====================
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

    # ==================== Analytics (Legacy) ====================
    web_bp.add_url_rule(
        "/analytics",
        view_func=analytics_summary,
        methods=["GET"],
    )

    # ==================== Numbers Dictation Admin (Legacy/Drive-backed) ====================
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
    web_bp.add_url_rule(
        "/numbers/admin/manifests:guest-preview",
        view_func=numbers_admin_mark_guest_preview_manifest,
        methods=["POST"],
    )

    # ==================== Audio Lessons (Legacy/Drive-backed) ====================
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

    # ==================== Speaking Practice Create (Legacy/Drive-backed) ====================
    web_bp.add_url_rule(
        "/speaking-practice/sets",
        view_func=speaking_practice_create,
        methods=["POST"],
    )


__all__ = ["register_legacy_web_routes"]
