"""
DELF Exam Practice API endpoints - Database + GitHub-backed.

User APIs: List and retrieve DELF test papers
Admin APIs: Register/update/delete test paper metadata

GitHub layout (example):

delf/a2/tout-public-a2/CO/tp/tp-01.json
delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste05.mp3
delf/a2/tout-public-a2/CO/assets/tp01-q1-a.webp
"""

from __future__ import annotations

import base64
import binascii
from typing import Any

from flask import request, Response

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository
from src.shared.delf_practice.schemas import (
    CreateDelfTestPaperRequest,
    UpdateDelfTestPaperRequest,
    DelfTestPaperResponse,
    DelfTestPaperDetailResponse,
    SaveDelfTestContentRequest,
    UploadDelfRepoFileRequest,
)
from src.utils.response_builder import ResponseBuilder


def _get_delf_params() -> tuple[str, str, str]:
    """Extract level, variant, section from query params."""
    level = (request.args.get("level") or "").strip().upper()
    variant = (request.args.get("variant") or "").strip()
    section = (request.args.get("section") or "").strip()

    if not level:
        raise BadRequestError("level is required (e.g., A2, B1, B2)")

    return level, variant, section


def _is_guest_mode() -> bool:
    raw = (request.args.get("guest_mode") or "").strip().lower()
    return raw in ("1", "true", "yes")


def _is_guest_preview_record(record: Any) -> bool:
    extra = getattr(record, "extra", None) or {}
    return bool(extra.get("guest_preview"))


def _filter_guest_preview_records(records: list[Any], limit: int = 2) -> list[Any]:
    flagged = [record for record in records if _is_guest_preview_record(record)]
    if flagged:
        return flagged[:limit]
    return records[:limit]


def _is_guest_accessible_paper(
    repo: DelfTestPaperRepository,
    *,
    paper: Any,
    level: str,
    variant: str,
    section: str,
    limit: int = 2,
) -> bool:
    papers = repo.list_by_level(
        level=level,
        section=section or None,
        variant=variant or None,
    )
    allowed_ids = {candidate.id for candidate in _filter_guest_preview_records(papers, limit=limit)}
    return paper.id in allowed_ids


# ============================================================================
# USER APIs - Test Paper Listing & Retrieval
# ============================================================================


def delf_list_tests():
    """
    GET /web/delf/tests?level=A2&variant=tout-public-a2&section=CO

    Returns list of available DELF test papers (from database).
    """
    level, variant, section = _get_delf_params()
    guest_mode = _is_guest_mode()

    repo = DelfTestPaperRepository()
    papers = repo.list_by_level(
        level=level,
        section=section or None,
        variant=variant or None,
    )
    if guest_mode:
        papers = _filter_guest_preview_records(papers)

    items = []
    for paper in papers:
        item = DelfTestPaperResponse(
            id=paper.id,
            test_id=paper.test_id,
            level=paper.level,
            variant=paper.variant,
            section=paper.section,
            exercise_count=paper.exercise_count,
            audio_filename=paper.audio_filename,
            status=paper.status,
            created_at=paper.created_at,
        )
        items.append(item.model_dump(mode="json"))

    return ResponseBuilder().success(data={"items": items, "level": level}).build()


def delf_get_test(test_id: str):
    """
    GET /web/delf/tests/<test_id>?level=A2&variant=tout-public-a2&section=CO

    Returns full test paper with content fetched from GitHub.
    """
    level, variant, section = _get_delf_params()

    if not variant or not section:
        raise BadRequestError("variant and section are required")

    repo = DelfTestPaperRepository()
    paper = repo.get_by_test_id(test_id, level, variant, section)

    if not paper:
        raise NotFoundError("Test paper not found")
    if _is_guest_mode() and not _is_guest_accessible_paper(
        repo,
        paper=paper,
        level=level,
        variant=variant,
        section=section,
    ):
        raise NotFoundError("Test paper not available in guest mode")

    # Fetch content from GitHub
    github_repo = GitHubDelfRepository()

    try:
        content = github_repo.fetch_test_paper(paper.github_path)
    except Exception as e:
        raise NotFoundError(f"Test paper content not found on GitHub: {e}")

    # Build audio URL
    audio_url = None
    if paper.audio_filename:
        audio_url = github_repo.audio_url(
            level=paper.level.lower(),
            variant=paper.variant,
            section=paper.section,
            filename=paper.audio_filename,
        )

    result = DelfTestPaperDetailResponse(
        id=paper.id,
        test_id=paper.test_id,
        level=paper.level,
        variant=paper.variant,
        section=paper.section,
        exercise_count=paper.exercise_count,
        audio_filename=paper.audio_filename,
        status=paper.status,
        created_at=paper.created_at,
        updated_at=paper.updated_at,
        github_path=paper.github_path,
        content=content,
        audio_url=audio_url,
    )

    return ResponseBuilder().success(data=result.model_dump(mode="json")).build()


def delf_proxy_audio(audio_path: str):
    """
    GET /web/delf/audio/<path:audio_path>

    Proxy audio file from GitHub.
    Path format: <level>/<variant>/<section>/audio/<filename>
    """
    github_repo = GitHubDelfRepository()
    url = f"{github_repo.base_url}/delf/{audio_path}"

    try:
        resp = github_repo.fetch_raw(url)
    except Exception:
        raise NotFoundError("Audio file not found")

    # Determine content type
    content_type = resp.headers.get("Content-Type", "audio/mpeg")

    return Response(
        resp.iter_content(chunk_size=8192),
        content_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


def delf_proxy_asset(asset_path: str):
    """
    GET /web/delf/assets/<path:asset_path>

    Proxy image asset from GitHub.
    Path format: <level>/<variant>/<section>/assets/<filename>
    """
    github_repo = GitHubDelfRepository()
    url = f"{github_repo.base_url}/delf/{asset_path}"

    try:
        resp = github_repo.fetch_raw(url)
    except Exception:
        raise NotFoundError("Asset not found")

    content_type = resp.headers.get("Content-Type", "image/webp")

    return Response(
        resp.iter_content(chunk_size=8192),
        content_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ============================================================================
# ADMIN APIs - Test Paper Management
# ============================================================================


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_create_test(user_id: str):
    """
    POST /web/delf/admin/tests

    Register a new DELF test paper (saves metadata to DB).

    Body:
    {
        "test_id": "tp-01",
        "level": "A2",
        "variant": "tout-public-a2",
        "section": "CO",
        "exercise_count": 6,
        "audio_filename": "DELF_TP_A2_Piste05.mp3"
    }
    """
    body = request.get_json() or {}

    try:
        req = CreateDelfTestPaperRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    repo = DelfTestPaperRepository()

    # Check for duplicates
    existing = repo.get_by_test_id(req.test_id, req.level, req.variant, req.section)
    if existing:
        raise BadRequestError(
            f"Test paper '{req.test_id}' already exists for {req.level}/{req.variant}/{req.section}"
        )

    # Generate GitHub path
    github_path = (
        f"delf/{req.level.lower()}/{req.variant}/{req.section}/tp/{req.test_id}.json"
    )

    paper = repo.create(
        test_id=req.test_id,
        level=req.level,
        variant=req.variant,
        section=req.section,
        github_path=github_path,
        exercise_count=req.exercise_count,
        audio_filename=req.audio_filename,
        status=req.status,
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "id": paper.id,
                "message": "Test paper registered.",
                "github_path": github_path,
            },
            status_code=201,
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_update_test(user_id: str, test_paper_id: str):
    """
    PATCH /web/delf/admin/tests/<test_paper_id>

    Update test paper metadata.
    """
    body = request.get_json() or {}

    try:
        req = UpdateDelfTestPaperRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    repo = DelfTestPaperRepository()

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    paper = repo.update(test_paper_id, **updates)

    if not paper:
        raise NotFoundError("Test paper not found")

    return (
        ResponseBuilder()
        .success(data={"id": paper.id, "message": "Test paper updated"})
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_delete_test(user_id: str, test_paper_id: str):
    """
    DELETE /web/delf/admin/tests/<test_paper_id>

    Delete test paper metadata.
    """
    repo = DelfTestPaperRepository()
    success = repo.delete(test_paper_id)

    if not success:
        raise NotFoundError("Test paper not found")

    return (
        ResponseBuilder()
        .success(data={"message": "Test paper deleted"})
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_save_test_content(user_id: str):
    """
    POST /web/delf/admin/content

    Save the full DELF test paper JSON to GitHub and upsert DB metadata.

    Body:
    {
        "level": "A2",
        "variant": "tout-public-a2",
        "section": "CO",
        "content": { ... DelfTestPaper schema ... }
    }

    Backward compatibility:
    {
        "test_paper_id": "uuid",
        "content": { ... }
    }
    """
    body = request.get_json() or {}

    try:
        req = SaveDelfTestContentRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    repo = DelfTestPaperRepository()

    content_payload = req.content.model_copy(deep=True)
    normalized_audio_filename = content_payload.audio_filename
    if normalized_audio_filename and normalized_audio_filename.startswith("audio/"):
        normalized_audio_filename = normalized_audio_filename.split("/", 1)[1]
        content_payload.audio_filename = normalized_audio_filename

    paper = None

    if req.test_paper_id:
        paper = repo.get_by_id(req.test_paper_id)
        if not paper:
            raise NotFoundError("Test paper not found")
        if paper.test_id != content_payload.test_id:
            raise BadRequestError(
                "content.test_id does not match the existing test paper metadata"
            )
        if paper.section != (req.section or paper.section):
            raise BadRequestError(
                "section does not match the existing test paper metadata"
            )
    else:
        if not req.level or not req.variant or not req.section:
            raise BadRequestError(
                "Either test_paper_id or (level, variant, section) is required"
            )

        paper = repo.get_by_test_id(
            content_payload.test_id,
            req.level,
            req.variant,
            req.section,
        )

        if not paper:
            github_path = (
                f"delf/{req.level.lower()}/{req.variant}/{req.section}/tp/"
                f"{content_payload.test_id}.json"
            )
            paper = repo.create(
                test_id=content_payload.test_id,
                level=req.level,
                variant=req.variant,
                section=req.section,
                github_path=github_path,
                exercise_count=len(content_payload.exercises),
                audio_filename=normalized_audio_filename,
                status=req.status,
            )

    github_mgr = GitHubDelfManager()
    content = content_payload.model_dump_json(indent=2, by_alias=True)
    result = github_mgr.create_or_update_file(
        file_path=paper.github_path,
        content=content.encode("utf-8"),
        commit_message=f"chore: update DELF test content {paper.test_id}",
    )

    update_fields: dict[str, object] = {
        "exercise_count": len(content_payload.exercises),
    }
    if normalized_audio_filename:
        update_fields["audio_filename"] = normalized_audio_filename
    if req.test_paper_id:
        repo.update(req.test_paper_id, **update_fields)
    else:
        repo.update(paper.id, **update_fields)

    return (
        ResponseBuilder()
        .success(
            data={
                "message": "Test paper content saved to GitHub",
                "id": paper.id,
                "test_id": paper.test_id,
                "level": paper.level,
                "variant": paper.variant,
                "section": paper.section,
                "file_path": paper.github_path,
                "github_url": result.get("content", {}).get("html_url"),
                "exercise_count": len(content_payload.exercises),
            }
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_upload_file(user_id: str):
    """
    POST /web/delf/admin/files

    Upload an asset/audio file to GitHub via base64 payload.

    Body:
    {
        "test_paper_id": "uuid",
        "folder": "assets|audio",
        "filename": "tp01-q1-a.webp",
        "content_base64": "<base64>",
        "update_audio_filename": true
    }
    """
    body = request.get_json() or {}

    try:
        req = UploadDelfRepoFileRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    repo = DelfTestPaperRepository()
    paper = repo.get_by_id(req.test_paper_id)

    if not paper:
        raise NotFoundError("Test paper not found")

    try:
        content_bytes = base64.b64decode(req.content_base64, validate=True)
    except (binascii.Error, ValueError) as e:
        raise BadRequestError(f"Invalid content_base64: {e}")

    filename = req.filename.split("/")[-1]
    file_path = (
        f"delf/{paper.level.lower()}/{paper.variant}/{paper.section}/{req.folder}/{filename}"
    )

    github_mgr = GitHubDelfManager()
    result = github_mgr.create_or_update_file(
        file_path=file_path,
        content=content_bytes,
        commit_message=f"chore: upload DELF {req.folder} file for {paper.test_id} ({filename})",
    )

    if req.folder == "audio" and req.update_audio_filename:
        repo.update(req.test_paper_id, audio_filename=filename)

    return (
        ResponseBuilder()
        .success(
            data={
                "message": f"{req.folder.capitalize()} file saved to GitHub",
                "file_path": file_path,
                "github_url": result.get("content", {}).get("html_url"),
                "filename": filename,
            }
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def delf_admin_mark_guest_preview(user_id: str):
    """
    POST /web/delf/admin/tests:guest-preview
    """
    body = request.get_json(silent=True) or {}
    level = str(body.get("level") or "").strip().upper()
    variant = str(body.get("variant") or "").strip() or None
    section = str(body.get("section") or "").strip() or None
    count_raw = body.get("count", 2)

    if not level:
        raise BadRequestError("level is required")

    try:
        count = int(count_raw)
    except (TypeError, ValueError):
        raise BadRequestError("count must be an integer")

    if count < 0:
        raise BadRequestError("count must be zero or greater")

    repo = DelfTestPaperRepository()
    papers = repo.list_by_level(level=level, section=section, variant=variant)
    selected_ids = {paper.id for paper in papers[:count]}

    updated_ids: list[str] = []
    for paper in papers:
        extra = dict(paper.extra or {})
        extra["guest_preview"] = paper.id in selected_ids
        if repo.update(paper.id, extra=extra):
            updated_ids.append(paper.id)

    return ResponseBuilder().success(
        data={
            "level": level,
            "variant": variant,
            "section": section,
            "count": count,
            "selected_ids": list(selected_ids),
            "updated_ids": updated_ids,
        }
    ).build()


# Export all endpoints
__all__ = [
    # User endpoints
    "delf_list_tests",
    "delf_get_test",
    "delf_proxy_audio",
    "delf_proxy_asset",
    # Admin endpoints
    "delf_admin_create_test",
    "delf_admin_update_test",
    "delf_admin_delete_test",
    "delf_admin_save_test_content",
    "delf_admin_upload_file",
    "delf_admin_mark_guest_preview",
]
