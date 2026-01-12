"""
DriveRepository (minimal).

Provides:
- folder discovery/creation (ensure_path)
- file CRUD helpers by (name) or (appProperties.id)
- JSON convenience helpers
"""

from __future__ import annotations

import json
from typing import Any

from src.infra.drive.client import GoogleDriveClient


FOLDER_MIME = "application/vnd.google-apps.folder"


class DriveRepository:
    def __init__(self, g: GoogleDriveClient, *, root_name: str = "MemoMap") -> None:
        self.g = g
        self.root_name = root_name

    # ---------------------- folders ----------------------

    def _find_folder(self, name: str, parent_id: str = "root") -> str | None:
        safe = name.replace("'", "\\'")
        q = (
            f"name = '{safe}' and mimeType = '{FOLDER_MIME}' "
            f"and '{parent_id}' in parents and trashed = false"
        )
        res = self.g.drive_list(q=q, pageSize=1, fields="files(id)")
        files = res.get("files", []) or []
        return files[0]["id"] if files else None

    def _ensure_root_folder(self) -> str:
        root_id = self._find_folder(self.root_name)
        if root_id:
            return root_id
        meta = self.g.create_folder(self.root_name)
        return meta["id"]

    def _ensure_folder(self, name: str, parent_id: str) -> str:
        folder_id = self._find_folder(name, parent_id)
        if folder_id:
            return folder_id
        return self.g.create_folder(name, parent_id)["id"]

    def ensure_path(self, parts: list[str]) -> str:
        if not parts:
            raise ValueError("parts must be non-empty")
        parent = self._ensure_root_folder()
        for name in parts:
            parent = self._ensure_folder(name, parent)
        return parent

    # ---------------------- files ----------------------

    def _find_file(self, parent_id: str, name: str) -> str | None:
        safe = name.replace("'", "\\'")
        q = f"name = '{safe}' and '{parent_id}' in parents and trashed = false"
        res = self.g.drive_list(q=q, pageSize=1, fields="files(id)")
        files = res.get("files", []) or []
        return files[0]["id"] if files else None

    def find_file_by_property(self, parent_id: str, key: str, value: str) -> str | None:
        safe_value = value.replace("'", "\\'")
        q = (
            f"appProperties has {{ key='{key}' and value='{safe_value}' }} "
            f"and '{parent_id}' in parents and trashed = false"
        )
        res = self.g.drive_list(q=q, pageSize=1, fields="files(id)")
        files = res.get("files", []) or []
        return files[0]["id"] if files else None

    def upload_file(
        self,
        *,
        parent_id: str,
        name: str,
        media: bytes,
        mime_type: str,
        app_properties: dict[str, str] | None = None,
    ) -> str:
        meta: dict[str, Any] = {"name": name, "parents": [parent_id]}
        if app_properties:
            meta["appProperties"] = app_properties

        existing_id: str | None = None
        if app_properties and app_properties.get("id"):
            existing_id = self.find_file_by_property(
                parent_id, "id", app_properties["id"]
            )
        if not existing_id:
            existing_id = self._find_file(parent_id, name)

        if existing_id:
            update_meta = {k: v for k, v in meta.items() if k != "parents"}
            result = self.g.update_multipart(existing_id, update_meta, media, mime_type)
            return result.get("id") or existing_id

        result = self.g.upload_multipart(meta, media, mime_type)
        return result["id"]

    def upsert_json(
        self,
        *,
        parent_id: str,
        name: str,
        obj: dict[str, Any],
        app_properties: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        media = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        meta: dict[str, Any] = {"name": name, "parents": [parent_id]}
        if app_properties:
            meta["appProperties"] = app_properties

        existing_id: str | None = None
        if app_properties and app_properties.get("id"):
            existing_id = self.find_file_by_property(
                parent_id, "id", app_properties["id"]
            )
        if not existing_id:
            existing_id = self._find_file(parent_id, name)

        if existing_id:
            update_meta = {k: v for k, v in meta.items() if k != "parents"}
            return self.g.update_multipart(
                existing_id,
                update_meta,
                media,
                "application/json; charset=UTF-8",
            )

        return self.g.upload_multipart(
            meta,
            media,
            "application/json; charset=UTF-8",
        )

    def get_json(self, parent_id: str, name: str) -> dict[str, Any] | None:
        safe = name.replace("'", "\\'")
        q = f"name = '{safe}' and '{parent_id}' in parents and trashed = false"
        res = self.g.drive_list(q=q, pageSize=1, fields="files(id)")
        files = res.get("files", []) or []
        if not files:
            return None
        data = self.g.drive_download(files[0]["id"])
        return json.loads(data.decode("utf-8"))

    def list_items(
        self,
        *,
        parent_id: str,
        page_size: int = 100,
        page_token: str | None = None,
        order_by: str | None = None,
        fields: str = "nextPageToken, files(id,name,mimeType,modifiedTime,size)",
    ) -> dict[str, Any]:
        q = f"'{parent_id}' in parents and trashed = false"
        return self.g.drive_list(
            q=q,
            pageSize=page_size,
            pageToken=page_token,
            orderBy=order_by,
            fields=fields,
        )


__all__ = ["DriveRepository", "FOLDER_MIME"]
