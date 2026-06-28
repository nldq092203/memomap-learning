# Legacy SQL Vocabulary Archive

This folder keeps the old SQL-backed vocabulary implementation for reference
after active Web and Extension vocabulary routes moved to MongoDB.

Code in this package must not be imported by active app routes. If a legacy
flow needs to be reintroduced for migration or debugging, copy or adapt the
specific code behind an explicit temporary route instead of importing this
archive directly.

Archived areas:

- SQL vocabulary controller helpers.
- SQL vocabulary query helpers.
- SQL SRS service wrapper.
- SQL-to-Mongo vocabulary compatibility service.

`VocabularyCardORM` and the SQL `vocabulary_cards` table have been removed from
active SQLAlchemy metadata after the MongoDB migration was completed.
