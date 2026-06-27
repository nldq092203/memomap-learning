"""
Minimal Google Drive REST client (Drive v3).

We avoid heavy Google SDK dependencies and use `requests` directly.
This client expects a valid OAuth2 access token with Drive scopes.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import requests

from src.extensions import logger


class GoogleDriveError(RuntimeError):
    def __init__(self, status_code: int, response_text: str):
        super().__init__(f"Google Drive API error {status_code}: {response_text}")
        self.status_code = status_code
        self.response_text = response_text


class GoogleDriveClient:
    DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3"
    DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3"

    def __init__(self, access_token: str, *, timeout: float = 15.0) -> None:
        if not access_token:
            raise ValueError("access_token is required")
        self.access_token = access_token
        self.timeout = timeout

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self.access_token}"}
        if extra:
            headers.update(extra)
        return headers

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        data: bytes | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> requests.Response:
        try:
            resp = requests.request(
                method=method,
                url=url,
                params=params,
                headers=self._headers(headers),
                data=data,
                json=json_body,
                timeout=self.timeout,
            )
        except Exception as exc:  # pragma: no cover
            logger.error(f"[DRIVE] request failed method={method} url={url} err={exc}")
            raise

        if resp.status_code >= 400:
            raise GoogleDriveError(resp.status_code, resp.text[:1000])

        return resp

    # ---------------------- Drive APIs ----------------------

    def drive_list(
        self,
        *,
        q: str,
        pageSize: int = 100,
        pageToken: str | None = None,
        fields: str | None = None,
        orderBy: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"q": q, "pageSize": pageSize}
        if pageToken:
            params["pageToken"] = pageToken
        if fields:
            params["fields"] = fields
        if orderBy:
            params["orderBy"] = orderBy

        resp = self._request("GET", f"{self.DRIVE_BASE_URL}/files", params=params)
        return resp.json()

    def drive_get(self, file_id: str, *, fields: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if fields:
            params["fields"] = fields
        resp = self._request(
            "GET", f"{self.DRIVE_BASE_URL}/files/{file_id}", params=params
        )
        return resp.json()

    def drive_download(self, file_id: str) -> bytes:
        resp = self._request(
            "GET",
            f"{self.DRIVE_BASE_URL}/files/{file_id}",
            params={"alt": "media"},
        )
        return resp.content

    def create_folder(self, name: str, parent_id: str = "root") -> dict[str, Any]:
        body = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        resp = self._request("POST", f"{self.DRIVE_BASE_URL}/files", json_body=body)
        return resp.json()

    def upload_multipart(
        self, meta: dict[str, Any], media: bytes, mime_type: str
    ) -> dict[str, Any]:
        boundary = f"==============={uuid.uuid4().hex}=="
        body = self._multipart_body(
            boundary=boundary, meta=meta, media=media, mime_type=mime_type
        )

        resp = self._request(
            "POST",
            f"{self.DRIVE_UPLOAD_URL}/files",
            params={"uploadType": "multipart"},
            headers={"Content-Type": f"multipart/related; boundary={boundary}"},
            data=body,
        )
        return resp.json()

    def update_multipart(
        self,
        file_id: str,
        meta: dict[str, Any],
        media: bytes,
        mime_type: str,
    ) -> dict[str, Any]:
        boundary = f"==============={uuid.uuid4().hex}=="
        body = self._multipart_body(
            boundary=boundary, meta=meta, media=media, mime_type=mime_type
        )

        resp = self._request(
            "PATCH",
            f"{self.DRIVE_UPLOAD_URL}/files/{file_id}",
            params={"uploadType": "multipart"},
            headers={"Content-Type": f"multipart/related; boundary={boundary}"},
            data=body,
        )
        return resp.json()

    @staticmethod
    def _multipart_body(
        *, boundary: str, meta: dict[str, Any], media: bytes, mime_type: str
    ) -> bytes:
        meta_bytes = json.dumps(meta, ensure_ascii=False).encode("utf-8")

        parts: list[bytes] = []
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(b"Content-Type: application/json; charset=UTF-8\r\n\r\n")
        parts.append(meta_bytes)
        parts.append(b"\r\n")

        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        parts.append(media)
        parts.append(b"\r\n")

        parts.append(f"--{boundary}--\r\n".encode("utf-8"))
        return b"".join(parts)


__all__ = ["GoogleDriveClient", "GoogleDriveError"]
