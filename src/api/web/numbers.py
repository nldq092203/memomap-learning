"""Numbers Dictation API endpoints for Web.

Runtime flow (no DB persistence):
- Sessions are in-memory
- Exercises are sampled from a pre-generated dataset (GitHub-backed by default)

Admin dataset generation is exposed separately under /web/numbers/admin/*.
"""

from __future__ import annotations

from flask import Response, redirect, request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.config import Config
from src.infra.drive import DriveRepository, GoogleDriveClient
from src.shared.numbers.controllers import (
    build_audio_url,
    get_generator,
    parse_number_types,
)
from src.shared.numbers.session_engine import (
    apply_answer,
    compute_summary,
    get_next_exercise,
    get_session,
    save_session,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
def numbers_create_session(user_id: str):
    """POST /web/numbers/sessions

    Preferred body:
    { \"types\": [\"PHONE\", \"YEAR\"], \"count\": 5 }

    Back-compat (best-effort):
    { \"difficulty\": \"medium\", \"count\": 10 }
    """
    payload = request.get_json(silent=True) or {}

    raw_types = payload.get("types")
    count_raw = payload.get("count", 5)

    try:
        count = int(count_raw)
    except Exception:
        raise BadRequestError("count must be an integer")

    if isinstance(raw_types, list) and raw_types:
        try:
            types = parse_number_types(raw_types)
        except ValueError as e:
            raise BadRequestError(str(e))
    else:
        # Back-compat default
        try:
            types = parse_number_types(["PHONE", "YEAR", "PRICE", "TIME"])
        except ValueError as e:
            raise BadRequestError(str(e))

    try:
        generator = get_generator()
        session = generator.create_session(types, count)
        save_session(session)
    except Exception as e:
        raise BadRequestError(str(e))

    return (
        ResponseBuilder()
        .success(
            data={
                "session_id": session.id,
                "types": [t.value for t in types],
                "count": count,
            },
            status_code=201,
        )
        .build()
    )


@require_auth
def numbers_get_next_exercise(session_id: str, user_id: str):
    """GET /web/numbers/sessions/{session_id}/next"""
    session = get_session(session_id)
    if not session:
        raise NotFoundError("Session not found")

    state = get_next_exercise(session)
    if not state:
        summary = compute_summary(session)
        return (
            ResponseBuilder()
            .success(
                data={"completed": True, "summary": summary.model_dump(mode="json")}
            )
            .build()
        )

    exercise = state.exercise
    return (
        ResponseBuilder()
        .success(
            data={
                "exercise_id": state.id,
                "number_type": exercise.number_type.value,
                "audio_ref": exercise.audio_ref,
                "audio_url": build_audio_url(exercise.audio_ref),
            }
        )
        .build()
    )


@require_auth
def numbers_submit_answer(session_id: str, user_id: str):
    """POST /web/numbers/sessions/{session_id}/answer

    Body:
    { \"exercise_id\": \"...\", \"answer\": \"...\" }
    """
    session = get_session(session_id)
    if not session:
        raise NotFoundError("Session not found")

    payload = request.get_json(silent=True) or {}
    exercise_id = payload.get("exercise_id")
    answer = payload.get("answer", "")

    if not isinstance(exercise_id, str) or not exercise_id:
        raise BadRequestError("exercise_id is required")

    try:
        state, result = apply_answer(session, exercise_id, str(answer))
    except Exception as e:
        raise BadRequestError(str(e))

    return (
        ResponseBuilder()
        .success(
            data={
                "exercise_id": state.id,
                "correct": result.is_correct,
                "errors": [e.model_dump(mode="json") for e in result.errors],
            }
        )
        .build()
    )


@require_auth
def numbers_get_summary(session_id: str, user_id: str):
    """GET /web/numbers/sessions/{session_id}/summary"""
    session = get_session(session_id)
    if not session:
        raise NotFoundError("Session not found")

    summary = compute_summary(session)
    return ResponseBuilder().success(data=summary.model_dump(mode="json")).build()


def numbers_audio_stream(audio_ref: str):
    """GET /web/numbers/audio/{audio_ref}

    - If `audio_ref` is a Git-backed path (contains '/'): redirect to NUMBERS_AUDIO_BASE_URL/audio_ref
    - Else treat it as a Drive file id and stream from Drive (requires X-Google-Access-Token)
    """
    if "/" in audio_ref:
        base_url = getattr(Config, "NUMBERS_AUDIO_BASE_URL", None)
        if not base_url:
            return (
                ResponseBuilder()
                .error(
                    message="NUMBERS_AUDIO_BASE_URL not configured",
                    status_code=500,
                )
                .build()
            )
        return redirect(f"{base_url.rstrip('/')}/{audio_ref.lstrip('/')}")

    access_token = (request.headers.get("X-Google-Access-Token") or "").strip()
    if not access_token:
        return (
            ResponseBuilder()
            .error(
                message="X-Google-Access-Token header is required to stream Drive audio",
                status_code=400,
            )
            .build()
        )

    repo = DriveRepository(GoogleDriveClient(access_token))
    meta = repo.g.drive_get(audio_ref, fields="id,mimeType")
    data = repo.g.drive_download(audio_ref)
    return Response(data, mimetype=meta.get("mimeType") or "audio/mpeg")
