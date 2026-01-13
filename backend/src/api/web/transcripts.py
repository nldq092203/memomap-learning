"""Transcript API endpoints for Web."""

from flask import request
from sqlalchemy.orm import Session

from src.api.decorators import require_auth, with_db
from src.api.schemas import TranscriptCreateRequest, TranscriptUpdateRequest
from src.api.errors import BadRequestError
from src.domain.controllers import (
    create_transcript_controller,
    list_transcripts_controller,
    get_transcript_controller,
    update_transcript_controller,
    delete_transcript_controller,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
@with_db
def transcripts_list_create(user_id: str, db: Session):
    """GET /web/transcripts - List transcripts
    POST /web/transcripts - Create transcript"""

    if request.method == "GET":
        language = request.args.get("language", "").strip() or None
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))

        data = list_transcripts_controller(
            db=db,
            user_id=user_id,
            language=language,
            limit=limit,
            offset=offset,
        )

        return ResponseBuilder().success(data=data).build()

    else:  # POST
        body = request.get_json(silent=True) or {}

        try:
            req = TranscriptCreateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        data = create_transcript_controller(
            db=db,
            user_id=user_id,
            language=req.language,
            source_url=req.source_url,
            transcript=req.transcript,
            notes=req.notes,
            tags=req.tags,
            lesson_audio_folder_id=req.lesson_audio_folder_id,
            extra=req.extra,
        )

        return ResponseBuilder().success(data=data, status_code=201).build()


@require_auth
@with_db
def transcripts_detail(transcript_id: str, user_id: str, db: Session):
    """GET/PUT/DELETE /web/transcripts/{transcript_id}"""

    if request.method == "GET":
        data = get_transcript_controller(
            db=db, user_id=user_id, transcript_id=transcript_id
        )
        return ResponseBuilder().success(data=data).build()

    elif request.method == "PUT":
        body = request.get_json(silent=True) or {}

        try:
            req = TranscriptUpdateRequest(**body)
        except Exception as e:
            raise BadRequestError(str(e))

        updates = req.model_dump(exclude_none=True)
        data = update_transcript_controller(
            db=db, user_id=user_id, transcript_id=transcript_id, **updates
        )

        return ResponseBuilder().success(data=data).build()

    else:  # DELETE
        delete_transcript_controller(
            db=db, user_id=user_id, transcript_id=transcript_id
        )
        return (
            ResponseBuilder()
            .success(message="Transcript deleted", status_code=204)
            .build()
        )
