# Legacy SQL Learning Archive

This folder keeps the old SQL-backed learning implementation for reference
after the revamp disabled the active Sessions, Transcripts, and standalone
Analytics API routes.

Code in this package must not be imported by active app routes. If a legacy
flow needs to be reintroduced for migration or debugging, copy or adapt the
specific code behind an explicit temporary route instead of importing this
archive directly.

Archived areas:

- Session route handlers and controller/query helpers.
- Transcript route handlers and controller/query helpers.
- Standalone analytics route handler and service.

ORM models remain in the active DB metadata for now so migrations and existing
database schema imports stay stable until a separate data-retention decision.
