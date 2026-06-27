"""Legacy web API route registration.

These routes remain available during the revamp so existing flows do not
break while the new archive/progress APIs are built. They should not be used
by new revamp features.
"""

from __future__ import annotations

from typing import Any, Callable

from flask import Blueprint

from src.api.web.analytics import analytics_summary
from src.api.web.sessions import sessions_detail, sessions_list_create
from src.api.web.transcripts import transcripts_detail, transcripts_list_create
from src.utils.response_builder import ResponseBuilder


LEGACY_WRITE_DISABLED_MESSAGE = (
    "This legacy write flow has been disabled during the revamp."
)
LEGACY_DRIVE_DISABLED_MESSAGE = (
    "This legacy Drive-backed flow has been disabled during the revamp."
)


def _legacy_disabled_handler(flow: str, *, message: str) -> Callable[..., Any]:
    """Build a uniquely named handler for a disabled legacy route."""

    def handler(*args: Any, **kwargs: Any):
        del args, kwargs
        return (
            ResponseBuilder()
            .error(
                error={"code": "legacy_flow_disabled", "flow": flow},
                message=message,
                status_code=410,
            )
            .build()
        )

    handler.__name__ = f"{flow}_disabled"
    return handler


def _add_disabled_legacy_route(
    web_bp: Blueprint,
    rule: str,
    *,
    endpoint: str,
    methods: list[str],
    message: str = LEGACY_WRITE_DISABLED_MESSAGE,
) -> None:
    web_bp.add_url_rule(
        rule,
        endpoint=endpoint,
        view_func=_legacy_disabled_handler(endpoint, message=message),
        methods=methods,
    )


def register_legacy_web_routes(web_bp: Blueprint) -> None:
    """Register web routes that are being sunset by the revamp."""

    # ==================== Sessions (Legacy) ====================
    web_bp.add_url_rule(
        "/sessions",
        view_func=sessions_list_create,
        methods=["GET"],
    )
    _add_disabled_legacy_route(
        web_bp,
        "/sessions",
        endpoint="legacy_sessions_create",
        methods=["POST"],
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
        methods=["GET"],
    )
    _add_disabled_legacy_route(
        web_bp,
        "/transcripts",
        endpoint="legacy_transcripts_create",
        methods=["POST"],
    )
    web_bp.add_url_rule(
        "/transcripts/<transcript_id>",
        view_func=transcripts_detail,
        methods=["GET"],
    )
    _add_disabled_legacy_route(
        web_bp,
        "/transcripts/<transcript_id>",
        endpoint="legacy_transcripts_update_delete",
        methods=["PUT", "DELETE"],
    )

    # ==================== Analytics (Legacy) ====================
    web_bp.add_url_rule(
        "/analytics",
        view_func=analytics_summary,
        methods=["GET"],
    )

    # ==================== Numbers Dictation Admin (Legacy/Drive-backed) ====================
    _add_disabled_legacy_route(
        web_bp,
        "/numbers/admin/datasets",
        endpoint="legacy_numbers_admin_generate",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/numbers/admin/datasets",
        endpoint="legacy_numbers_admin_list",
        methods=["GET"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/numbers/admin/manifests:cleanup",
        endpoint="legacy_numbers_admin_cleanup_manifest",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/numbers/admin/manifests:guest-preview",
        endpoint="legacy_numbers_admin_guest_preview_manifest",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )

    # ==================== Audio Lessons (Legacy/Drive-backed) ====================
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons",
        endpoint="legacy_audio_lessons_list",
        methods=["GET"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons",
        endpoint="legacy_audio_lesson_create",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons/tts",
        endpoint="legacy_audio_lesson_generate_tts",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons/conversation",
        endpoint="legacy_audio_lesson_generate_conversation_tts",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons/<lesson_id>/transcript",
        endpoint="legacy_audio_lesson_transcript",
        methods=["GET"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons/<lesson_id>/audio",
        endpoint="legacy_audio_lesson_audio",
        methods=["GET"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )
    _add_disabled_legacy_route(
        web_bp,
        "/audio-lessons/<lesson_id>/questions",
        endpoint="legacy_audio_lesson_save_questions",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )

    # ==================== Speaking Practice Create (Legacy/Drive-backed) ====================
    _add_disabled_legacy_route(
        web_bp,
        "/speaking-practice/sets",
        endpoint="legacy_speaking_practice_create",
        methods=["POST"],
        message=LEGACY_DRIVE_DISABLED_MESSAGE,
    )


__all__ = ["register_legacy_web_routes"]
