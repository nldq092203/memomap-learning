"""Domain exceptions."""


class DomainError(Exception):
    """Base exception for domain errors."""

    pass


class ValidationError(DomainError):
    """Invalid input data."""

    pass


class ResourceNotFoundError(DomainError):
    """Resource not found."""

    pass


class AuthorizationError(DomainError):
    """User not authorized to access resource."""

    pass

