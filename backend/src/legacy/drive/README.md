# Legacy Drive Archive

This folder keeps the old Google Drive-backed backend implementation for
reference while the revamp removes Drive from active app flows.

Code in this package must not be imported by active API routes. If a legacy
flow needs to be reintroduced for migration or debugging, copy or adapt the
specific code behind an explicit temporary route instead of importing this
archive directly.

Archived areas:

- Drive REST infrastructure.
- Learning Drive service wrapper.
- Audio lesson Drive routes.
- Numbers Drive admin/staging helpers.
- Numbers Google Drive repository adapter.
