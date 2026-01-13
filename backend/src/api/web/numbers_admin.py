"""Numbers Dictation admin endpoints (Drive + Azure TTS).

This keeps the original admin flow:
- Generate weekly datasets with Azure TTS
- Persist audio + manifest.json to Google Drive (staging)

Auth:
- JWT (Authorization: Bearer <jwt>)
- Admin token (X-Admin-Token)
- Google access token for Drive (X-Google-Access-Token)
"""

from __future__ import annotations

from src.api.decorators import require_admin_token, require_auth
from src.shared.numbers.admin.views import (
    admin_generate_numbers_dataset,
    admin_list_numbers_datasets,
    admin_cleanup_numbers_manifest,
)


@require_auth
# @require_admin_token
def numbers_admin_generate(user_id: str):
    """POST /web/numbers/admin/datasets"""
    return admin_generate_numbers_dataset()


@require_auth
# @require_admin_token
def numbers_admin_list(user_id: str):
    """GET /web/numbers/admin/datasets"""
    return admin_list_numbers_datasets()


@require_auth
# @require_admin_token
def numbers_admin_cleanup_manifest(user_id: str):
    """POST /web/numbers/admin/manifests:cleanup"""
    return admin_cleanup_numbers_manifest()


__all__ = [
    "numbers_admin_generate",
    "numbers_admin_list",
    "numbers_admin_cleanup_manifest",
]


