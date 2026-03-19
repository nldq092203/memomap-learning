"""Community feedback domain logic."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from src.api.errors import BadRequestError, ForbiddenError, NotFoundError
from src.infra.mongo import get_feedbacks_collection

VALID_FEEDBACK_STATUSES = ("planned", "in-progress", "done")


def serialize_feedback(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a Mongo document to a JSON-safe dict."""
    payload = dict(doc)
    payload["_id"] = str(payload["_id"])

    created_at = payload.get("created_at")
    if isinstance(created_at, datetime):
        payload["created_at"] = created_at.isoformat()

    updated_at = payload.get("updated_at")
    if isinstance(updated_at, datetime):
        payload["updated_at"] = updated_at.isoformat()

    return payload


class CommunityFeedbackService:
    """Encapsulates feedback CRUD and validation."""

    @staticmethod
    def list_feedbacks() -> list[dict[str, Any]]:
        col = get_feedbacks_collection()
        cursor = col.find().sort("created_at", -1)
        return [serialize_feedback(doc) for doc in cursor]

    @staticmethod
    def create_feedback(
        *,
        user_id: str,
        email: str,
        content: str,
    ) -> dict[str, Any]:
        normalized_content = CommunityFeedbackService._normalize_content(content)

        doc = {
            "user_id": user_id,
            "email": email,
            "content": normalized_content,
            "status": "planned",
            "created_at": datetime.now(timezone.utc),
        }

        col = get_feedbacks_collection()
        result = col.insert_one(doc)
        doc["_id"] = result.inserted_id

        return serialize_feedback(doc)

    @staticmethod
    def update_feedback(
        *,
        feedback_id: str,
        actor_user_id: str,
        content: str | None = None,
        status: str | None = None,
        can_update_status: bool = False,
    ) -> dict[str, Any]:
        doc = CommunityFeedbackService._get_feedback_or_raise(feedback_id)
        update_fields: dict[str, Any] = {}

        if content is not None:
            CommunityFeedbackService._require_owner(doc, actor_user_id)
            update_fields["content"] = CommunityFeedbackService._normalize_content(content)

        if status is not None:
            if not can_update_status:
                raise ForbiddenError("You are not allowed to update feedback status")
            update_fields["status"] = CommunityFeedbackService._normalize_status(status)

        if not update_fields:
            raise BadRequestError("Nothing to update")

        update_fields["updated_at"] = datetime.now(timezone.utc)

        col = get_feedbacks_collection()
        col.update_one({"_id": doc["_id"]}, {"$set": update_fields})
        doc.update(update_fields)

        return serialize_feedback(doc)

    @staticmethod
    def delete_feedback(*, feedback_id: str, actor_user_id: str) -> None:
        doc = CommunityFeedbackService._get_feedback_or_raise(feedback_id)
        CommunityFeedbackService._require_owner(doc, actor_user_id)

        col = get_feedbacks_collection()
        col.delete_one({"_id": doc["_id"]})

    @staticmethod
    def _get_feedback_or_raise(feedback_id: str) -> dict[str, Any]:
        try:
            oid = ObjectId(feedback_id)
        except Exception as exc:
            raise BadRequestError("Invalid feedback ID") from exc

        col = get_feedbacks_collection()
        doc = col.find_one({"_id": oid})
        if not doc:
            raise NotFoundError("Feedback not found")

        return doc

    @staticmethod
    def _require_owner(doc: dict[str, Any], actor_user_id: str) -> None:
        if str(doc["user_id"]) != str(actor_user_id):
            raise ForbiddenError("You can only modify your own feedback")

    @staticmethod
    def _normalize_content(content: str) -> str:
        normalized_content = (content or "").strip()
        if not normalized_content:
            raise BadRequestError("content is required")
        return normalized_content

    @staticmethod
    def _normalize_status(status: str) -> str:
        normalized_status = (status or "").strip()
        if normalized_status not in VALID_FEEDBACK_STATUSES:
            raise BadRequestError("status must be planned, in-progress, or done")
        return normalized_status
