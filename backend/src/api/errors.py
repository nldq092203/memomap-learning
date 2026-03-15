"""API error handling."""

from flask import Blueprint
from src.utils.response_builder import ResponseBuilder
from src.domain.errors import ValidationError, ResourceNotFoundError
from src.extensions import logger
from src.infra.auth.google_oauth import GoogleOAuthExchangeError, GoogleOAuthRefreshError
from src.infra.drive.client import GoogleDriveError


class APIError(Exception):
    """Base API error."""

    status_code = 500
    message = "Internal server error"

    def __init__(self, message: str | None = None, status_code: int | None = None):
        self.message = message or self.__class__.message
        self.status_code = status_code or self.__class__.status_code
        super().__init__(self.message)


class UnauthorizedError(APIError):
    """Authentication required or failed."""

    status_code = 401
    message = "Unauthorized"


class ForbiddenError(APIError):
    """User lacks permission."""

    status_code = 403
    message = "Forbidden"


class NotFoundError(APIError):
    """Resource not found."""

    status_code = 404
    message = "Not found"


class BadRequestError(APIError):
    """Invalid request."""

    status_code = 400
    message = "Bad request"


def register_error_handlers(bp: Blueprint):
    """Register error handlers on a blueprint."""

    @bp.errorhandler(APIError)
    def handle_api_error(error: APIError):
        return (
            ResponseBuilder()
            .error(message=error.message, status_code=error.status_code)
            .build()
        )

    @bp.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        return ResponseBuilder().error(message=str(error), status_code=400).build()

    @bp.errorhandler(ResourceNotFoundError)
    def handle_not_found_error(error: ResourceNotFoundError):
        return ResponseBuilder().error(message=str(error), status_code=404).build()

    @bp.errorhandler(GoogleDriveError)
    def handle_google_drive_error(error: GoogleDriveError):
        if error.status_code == 401:
            return (
                ResponseBuilder()
                .error(
                    message="Google Drive session expired or invalid. Please sign in with Google again.",
                    status_code=403,
                )
                .build()
            )

        return (
            ResponseBuilder()
            .error(message="Google Drive request failed.", status_code=502)
            .build()
        )

    @bp.errorhandler(GoogleOAuthRefreshError)
    def handle_google_oauth_refresh_error(error: GoogleOAuthRefreshError):
        return (
            ResponseBuilder()
            .error(
                message=str(error) or "Google Drive session expired or invalid. Please sign in with Google again.",
                status_code=403,
            )
            .build()
        )

    @bp.errorhandler(GoogleOAuthExchangeError)
    def handle_google_oauth_exchange_error(error: GoogleOAuthExchangeError):
        return (
            ResponseBuilder()
            .error(
                message=str(error) or "Google authentication failed.",
                status_code=401,
            )
            .build()
        )

    @bp.errorhandler(Exception)
    def handle_generic_error(error: Exception):
        logger.exception(f"[API] Unhandled error: {error}")
        return (
            ResponseBuilder()
            .error(message="Internal server error", status_code=500)
            .build()
        )
