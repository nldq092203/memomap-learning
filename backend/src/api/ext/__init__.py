"""
Extension API Blueprint - Limited Learning API for Chrome Extension.

Provides simplified endpoints for browser extension:
- Vocabulary (get/post/put)
- AI (explain/chat)
"""

from flask import Blueprint

from src.api.ext.vocab import ext_vocab_list, ext_vocab_create, ext_vocab_update
from src.api.ext.ai import ext_ai_chat
from src.api.errors import register_error_handlers


# Extension blueprint
ext_bp = Blueprint("ext", __name__)
register_error_handlers(ext_bp)

# ==================== Vocabulary ====================
ext_bp.add_url_rule(
    "/vocab",
    view_func=ext_vocab_list,
    methods=["GET"],
)
ext_bp.add_url_rule(
    "/vocab",
    view_func=ext_vocab_create,
    methods=["POST"],
)
ext_bp.add_url_rule(
    "/vocab/<card_id>",
    view_func=ext_vocab_update,
    methods=["PUT"],
)

# ==================== AI ====================
ext_bp.add_url_rule(
    "/ai/chat",
    view_func=ext_ai_chat,
    methods=["POST"],
)


__all__ = ["ext_bp"]
