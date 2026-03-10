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

from flask import request, Response

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository
from src.shared.delf_practice.schemas import (
    CreateDelfTestPaperRequest,
    UpdateDelfTestPaperRequest,
    DelfTestPaperResponse,
    DelfTestPaperDetailResponse,
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


# ============================================================================
# USER APIs - Test Paper Listing & Retrieval
# ============================================================================


@require_auth
def delf_list_tests(user_id: str):
    """
    GET /web/delf/tests?level=A2&variant=tout-public-a2&section=CO

    Returns list of available DELF test papers (from database).
    """
    level, variant, section = _get_delf_params()

    repo = DelfTestPaperRepository()
    papers = repo.list_by_level(
        level=level,
        section=section or None,
        variant=variant or None,
    )

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


@require_auth
def delf_get_test(user_id: str, test_id: str):
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


@require_auth
def delf_proxy_audio(user_id: str, audio_path: str):
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


@require_auth
def delf_proxy_asset(user_id: str, asset_path: str):
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
]
