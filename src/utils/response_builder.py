"""HTTP response builder utility."""

from flask import jsonify, make_response


class ResponseBuilder:
    """Builder pattern for consistent API responses."""

    def __init__(self):
        self._response = {
            "status": "success",
            "message": "",
            "data": None,
            "error": None,
        }
        self._status_code = 200
        self._headers: dict[str, str] = {}

    def success(self, message="Success", data=None, status_code=200):
        """Build a success response."""
        self._response["status"] = "success"
        self._response["message"] = message
        self._response["data"] = data
        self._response["error"] = None
        self._status_code = status_code
        return self

    def error(self, error=None, message="Something went wrong", status_code=400):
        """Build an error response."""
        self._response["status"] = "error"
        self._response["message"] = message
        self._response["data"] = None
        self._response["error"] = error
        self._status_code = status_code
        return self

    def with_headers(self, headers: dict[str, str] | None = None):
        """Add custom headers to the response."""
        if headers:
            self._headers.update(headers)
        return self

    def build(self):
        """Build and return the Flask response."""
        clean_response = {k: v for k, v in self._response.items() if v is not None}
        response = make_response(jsonify(clean_response), self._status_code)
        for key, value in self._headers.items():
            response.headers[key] = value
        return response

