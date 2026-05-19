# DELF MCP Server

Local MCP server that gives an AI agent the full DELF test-paper ingestion
lifecycle: validate JSON, pick a safe `test_id`, crop and upload image
assets from a screenshot, resolve audio filenames, save/list/get/update/
delete drafts, verify asset references, and publish drafts to active.

Tools (15 total):

### Validation & naming
| Tool                          | Purpose                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `validate_delf_content`       | Validate `DelfTestPaper` JSON (schema + DELF business rules).           |
| `suggest_delf_test_id`        | Read DB + GitHub corpus and return the next convention-aware ID.        |

### Draft lifecycle
| Tool                          | Purpose                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `save_delf_draft`             | Validate, then write `status="draft"` to DB + GitHub.                   |
| `list_delf_drafts`            | List drafts (newest first), optional level/section/variant filters.      |
| `get_delf_draft`              | Return metadata + content from GitHub for one draft.                     |
| `update_delf_draft`           | Validate and overwrite an existing draft's JSON.                         |
| `publish_delf_draft`          | Flip a draft to `status="active"`. Requires `confirm_publish`. Refuses if any referenced asset is missing. |
| `delete_delf_draft`           | Remove a draft. Requires `confirm_delete`. Drafts only.                  |

### Asset pipeline (Phase 2)
| Tool                          | Purpose                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `crop_screenshot_to_webp`     | Local crop + WebP encode preview (no GitHub touch).                      |
| `upload_delf_asset`           | Upload one image or audio file to GitHub.                                |
| `process_screenshot_options`  | One-shot: screenshot → crops → WebPs → uploaded `img_url` strings.        |
| `list_delf_assets`            | List `assets/` or `audio/` filenames for a scope.                        |
| `verify_delf_asset_references`| Cross-check every `img_url` / `audio_filename` against GitHub.            |
| `resolve_delf_audio_filename` | Convert a CO track number into the canonical audio filename.             |
| `migrate_delf_legacy_assets`  | Convert image refs to structured WebP paths and update paper JSON.       |

The asset pipeline closes the manual loop: the agent feeds a screenshot
and per-option crop boxes, the MCP crops, WebP-encodes, uploads to GitHub
under `assets/`, and returns the exact `img_url` strings to paste into the
JSON. Audio works the same way via `upload_delf_asset(kind="audio")` plus
`resolve_delf_audio_filename` for the per-level naming quirk
(`DELF_TP_A2_…` vs `Delf_TP_B1_…`).

## 1. Install

From the repo root:

```bash
cd backend
uv sync
uv pip install -r requirements-delf-mcp.txt          # MCP SDK
uv pip install -r requirements-delf-local.txt        # opencv-python-headless + Pillow (asset pipeline)
```

The asset-pipeline tools (`crop_screenshot_to_webp`,
`process_screenshot_options`) need OpenCV + Pillow. PNG/JPG/JPEG conversion
inside `migrate_delf_legacy_assets` needs Pillow. The other tools work without
them — if those modules are missing, only the image-processing path returns a
structured error pointing back here.

## 2. Configure `.env`

The server loads the same `backend/.env` file as the backend app.

Required:

```bash
POSTGRES_DSN=postgresql://...
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=nldq092203
GITHUB_REPO_NAME=memomap-audio-fr
WEB_ORIGIN=http://localhost:3000
```

Optional:

```bash
REDIS_ENABLED=true
REDIS_URL=redis://...
DELF_MCP_MAX_ASSET_MB=20    # max base64 payload per call (screenshots, uploads)
```

Redis is only used for cache invalidation. If Redis is unavailable, saving can
still succeed.

## 3. Smoke Test

From `backend/`:

```bash
uv run python -m scripts.delf_mcp.server
```

The process should block silently. Press `Ctrl-C` to stop it.

## 4. Use With Claude Code

Register the server:

```bash
claude mcp add delf-ingest \
  --scope user \
  --cwd "$HOME/Documents/Code/memomap-learning/memomap-learning-backend/backend" \
  -- \
  uv run python -m scripts.delf_mcp.server
```

Claude reads `backend/.env` because `cwd` is set to `backend/`.

Verify in Claude Code:

```text
/mcp
```

You should see `delf-ingest` and all 8 tools.

## 5. Use With Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.delf-ingest]
command = "uv"
args = ["run", "python", "-m", "scripts.delf_mcp.server"]
cwd = "/Users/you/Documents/Code/memomap-learning/memomap-learning-backend/backend"
```

Restart Codex after editing the config.

## 6. What Each Tool Does

The tools fall into three groups:

1. Prepare content: `validate_delf_content`, `suggest_delf_test_id`.
2. Work with drafts: `save_delf_draft`, `list_delf_drafts`,
   `get_delf_draft`, `update_delf_draft`, `delete_delf_draft`.
3. Publish reviewed content: `publish_delf_draft`.

### `validate_delf_content(content)`

Validates a `DelfTestPaper` JSON object or JSON string.

It checks:

- Required schema fields.
- Valid exercise and question structure.
- Duplicate exercise IDs.
- Duplicate nested question IDs.
- `correct_answer` indexes are inside the option list.
- CE papers do not include `audio_filename`.
- Nested-question exercises do not also use flat MCQ fields.
- French text quality warnings for common missing accents, for example
  `francais` -> `français`, `reponse` -> `réponse`, and `a la` -> `à la`.

Text quality findings are returned as `quality_warnings`; they are advisory and
do not block valid JSON from being saved.

This tool does not read GitHub, write GitHub, or touch the database.

Use it early and repeatedly while drafting.

### `suggest_delf_test_id(level, variant, section, title?)`

Reads existing data before recommending a `test_id`.

It checks:

- GitHub files under:
  `delf/{level_lower}/{variant}/{section}/tp/`
- DB rows in `delf_test_papers` for the same scope, including drafts, active,
  and archived records.

It returns the next convention-aware ID, usually `tp-XX`.

Example:

```json
{
  "level": "A2",
  "variant": "tout-public-a2",
  "section": "CE",
  "suggested_test_id": "tp-11"
}
```

Use this before saving. Do not invent IDs manually unless you already checked
the current corpus.

### `save_delf_draft(level, variant, section, content)`

Validates the content, performs a DB + GitHub duplicate preflight, then saves a
draft.

It writes:

- DB row in `delf_test_papers` with `status="draft"`.
- JSON file to:
  `delf/{level_lower}/{variant}/{section}/tp/{test_id}.json`

It also invalidates the DELF content cache best-effort.

Overwrite protection:

- Refuses if the `test_id` exists in the DB.
- Refuses if the GitHub JSON file already exists, even when the DB row is
  missing.
- Uses create-only GitHub behavior so it does not update an existing file by
  accident.

Use this only for a new paper. To change an existing draft, use
`update_delf_draft`.

### `list_delf_drafts(level?, section?, variant?, limit?)`

Lists papers with `status="draft"`, newest first. Every filter is optional;
`limit` defaults to 50 and is capped at 100.

```json
{
  "success": true,
  "drafts": [
    {
      "draft_id": "550e8400-...",
      "test_id": "tp-04",
      "level": "A2",
      "variant": "tout-public-a2",
      "section": "CE",
      "exercise_count": 6,
      "audio_filename": null,
      "github_path": "delf/a2/tout-public-a2/CE/tp/tp-04.json",
      "created_at": "2026-05-17T10:00:00+00:00"
    }
  ],
  "total": 1,
  "limit": 50
}
```

### `get_delf_draft(draft_id)`

Fetches one paper by its DB UUID. Reads the JSON straight from GitHub (no Redis
cache) and re-runs validation against it so the agent can tell if the persisted
content still satisfies the current schema. Returns `content_error` instead of
`content` if the JSON cannot be loaded.

Use this before editing or publishing when you want the exact persisted content,
not a local copy from the chat.

### `update_delf_draft(draft_id, content)`

Validates the new content, then overwrites the GitHub JSON and refreshes the
DB row's `exercise_count` and `audio_filename`. The status stays `draft`.

Refuses to:

- Update a paper whose status is `active` or `archived`.
- Rename: `content.test_id` must match the draft's existing `test_id`. To
  rename, `delete_delf_draft` then `save_delf_draft` with the new ID.

Use this for iterative fixes after previewing a draft.

### `publish_delf_draft(draft_id? | test_id+level+variant+section, confirm_publish)`

Flips a draft to `status="active"`. The student-facing list endpoint shows only
active papers, so this is the step that actually exposes a paper to learners.

Safety rails:

- `confirm_publish=true` is required.
- The paper's status must be `draft`; already-active papers are rejected.
- The persisted JSON is **re-fetched from GitHub and re-validated**. If it no
  longer passes the schema or DELF rules, publishing is refused — use
  `update_delf_draft` first.
- Invalidates the content cache so students see the new paper on the next read.

Identify the target by either `draft_id` (preferred) or the composite key
`(test_id, level, variant, section)`. The response includes `student_url`:

```text
{WEB_ORIGIN}/learning/delf-practice/{level}/{variant}/{section}
```

### `delete_delf_draft(draft_id, confirm_delete, delete_github_file?)`

Removes the DB row. If `delete_github_file=true` (default `false`), also
deletes the JSON file from GitHub.

Safety rails:

- `confirm_delete=true` is required.
- Only papers with `status="draft"` can be deleted. Active or archived papers
  must be demoted manually first.
- If GitHub deletion fails after the DB row was removed, the response includes
  a `github_warning` field and `github_file_deleted=false`.

Default behavior preserves the GitHub JSON file. Pass `delete_github_file=true`
only when you are sure the draft file should be removed from the content repo.

### `crop_screenshot_to_webp(screenshot_base64, crops|auto_detect, webp_quality?)`

Pure-local: takes a base64-encoded screenshot, returns one base64-encoded
WebP per crop box. Doesn't touch GitHub. Useful when the agent wants to
preview a crop before committing it, or when you only need the WebP bytes
(e.g. to inspect them).

Either pass explicit `crops=[{label, left, top, right, bottom}, ...]` or
`auto_detect={region, expected_count, min_area?, padding?}`. With auto_detect,
the MCP runs an OpenCV contour pass over the region and returns boxes
ordered left-to-right with labels `a`, `b`, `c`, …

Requires OpenCV + Pillow (`requirements-delf-local.txt`); returns a
structured error otherwise.

### `upload_delf_asset(level, variant, section, test_id, filename, content_base64, kind, overwrite?, question_number?, label?)`

Uploads a single image or audio file to GitHub for one DELF scope.

- `kind="image"` with `question_number` and `label` →
  `delf/{level}/{variant}/{section}/assets/{test_id}/qNN/{label}.ext`. The
  returned `relative_path` is `assets/{test_id}/qNN/{label}.ext` (what JSON
  expects).
- `kind="image"` without `question_number` and `label` preserves the legacy
  flat path: `delf/{level}/{variant}/{section}/assets/{filename}`.
- `kind="audio"` → `delf/{level}/{variant}/{section}/audio/{filename}`. The
  returned `relative_path` is the bare filename (the frontend prepends
  `audio/` itself).

Refuses overwrite by default; pass `overwrite=true` to replace an existing
file. Image extensions: `.webp`, `.png`, `.jpg`, `.jpeg`. Audio extensions:
`.mp3`, `.m4a`, `.wav`. Filename validation rejects path-traversal attempts.

### `process_screenshot_options(level, variant, section, test_id, screenshot_base64, questions, webp_quality?, overwrite?)`

One-shot pipeline: take the page screenshot, crop each option box, encode
each crop to WebP, upload to GitHub, and return the `img_url` strings to
paste into the JSON.

New image assets follow the structured convention
`assets/{test_id}/qNN/{label}.webp`, e.g. `assets/tp-04/q01/a.webp`.

Partial failures are reported per-option in `failures`; successful uploads
still appear in `results`. So if option `b` collides while `a` and `c`
succeed, the agent gets two new `img_url`s plus a structured note about
`b` and can re-attempt only that one.

### `list_delf_assets(level, variant, section, kind?)`

Lists existing image (`kind="image"`, default) or audio (`kind="audio"`)
filenames for a scope. Image listings include nested paths relative to
`assets/`, for example `tp-04/q01/a.webp`. A missing directory returns an
empty list.

### `verify_delf_asset_references(level, variant, section, content)`

Walks a `DelfTestPaper`, collects every `img_url` and the top-level
`audio_filename`, and checks each against the GitHub `assets/` / `audio/`
directories. Both legacy flat image refs (`assets/foo.webp`) and structured
refs (`assets/tp-04/q01/a.webp`) are supported. Returns `all_present: true`
only when every reference resolves; missing references are listed with their exact field path
(e.g. `exercises[1].questions[0].options[2].img_url`).

`publish_delf_draft` invokes this internally and refuses to flip status to
`active` when any reference is missing.

### `migrate_delf_legacy_assets(level, variant, section, test_id, dry_run?, confirm_write?, overwrite?, webp_quality?)`

Copies image refs to the structured per-paper WebP layout and updates the
paper JSON. Legacy source files are preserved. PNG/JPG/JPEG sources are
converted to WebP; existing WebP sources are copied.

Default behavior is dry-run only:

```json
{
  "level": "A2",
  "variant": "tout-public-a2",
  "section": "CO",
  "test_id": "tp-04",
  "dry_run": true
}
```

Dry-run returns `planned` entries like:

```json
{
  "field": "exercises[0].questions[0].options[0].img_url",
  "from": "assets/tp04-q1-a.png",
  "to": "assets/tp-04/q01/a.webp",
  "action": "convert_to_webp",
  "source_github_path": "delf/a2/tout-public-a2/CO/assets/tp04-q1-a.png",
  "target_github_path": "delf/a2/tout-public-a2/CO/assets/tp-04/q01/a.webp"
}
```

To write the migration:

```json
{
  "level": "A2",
  "variant": "tout-public-a2",
  "section": "CO",
  "test_id": "tp-04",
  "dry_run": false,
  "confirm_write": true
}
```

The tool copies each source asset, validates the updated JSON, verifies all
asset references, then commits the updated paper JSON. It does not delete old
flat files. If a target structured asset already exists, the tool refuses by
default; pass `overwrite=true` to replace targets. Use `webp_quality` (1-100,
default `92`) to control PNG/JPG/JPEG conversion quality. PNG/JPG/JPEG
conversion requires Pillow from `requirements-delf-local.txt`.

If the JSON points to a missing `.webp` legacy asset but the same basename
exists as `.png`, `.jpg`, or `.jpeg`, the migration uses that file as an
extension fallback and converts it to the structured `.webp` target. Dry-run
output includes `checked_source_paths`, `resolved_source_ref`, and
`source_resolution` so you can see exactly which file will be used.

### `resolve_delf_audio_filename(level, variant, section, track_number)`

Resolves a CO track number (read off the screenshot's headphone icon,
e.g. `🎧 28`) into the canonical GitHub audio filename for the given level.

Encapsulates per-level naming quirks:

| Level | Convention                              |
|-------|-----------------------------------------|
| A2    | `DELF_TP_A2_Piste{NN:02d}.mp3`          |
| B1    | `Delf_TP_B1_Piste{NN:02d}.mp3`          |
| other | `DELF_TP_{LEVEL}_Piste{NN:02d}.mp3` (fallback) |

The returned `audio_filename_value` is the exact string to paste into
`DelfTestPaper.audio_filename`. The tool also runs a `file_exists` check
against GitHub and surfaces `exists: true|false` so the agent gets an
early signal before saving.

## 7. Most Effective Workflow

### Creating a new paper (no assets)

1. Build the DELF JSON with a temporary `test_id`, for example `draft`.
2. Call `validate_delf_content`.
3. Fix validation errors until the content is valid.
4. Call `suggest_delf_test_id` with the real `level`, `variant`, and `section`.
5. Replace `content.test_id` with `suggested_test_id`.
6. Call `save_delf_draft`.
7. Open the returned `preview_url` and visually check the paper.
8. When the paper looks correct, call `publish_delf_draft` with
   `confirm_publish=true`.

### Creating a CE paper with image options

1. Paste the page screenshot into the agent so it can read the questions
   and identify the per-option crop boxes.
2. Call `suggest_delf_test_id` to pick the new `test_id`.
3. Call `process_screenshot_options` with the screenshot + crop boxes for
   each question that has image options. The MCP returns the canonical
   `img_url` for each option, such as `assets/tp-04/q01/a.webp`.
4. Assemble the `DelfTestPaper` JSON, pasting each returned `img_url` into
   the matching `DelfImageOption.img_url` field.
5. Call `validate_delf_content`, repair structural errors in a loop.
6. Call `save_delf_draft`.
7. Call `verify_delf_asset_references` — should report `all_present: true`.
8. Inspect the `preview_url`, then `publish_delf_draft`. The publish path
   re-runs validation and asset verification automatically.

### Creating a CO paper with audio

1. Read the headphone icon off the screenshot (e.g. `🎧 28` → track 28).
2. Call `resolve_delf_audio_filename(level, variant, section, track_number)`.
   The response's `audio_filename_value` is what to paste into
   `content.audio_filename`. Verify `exists: true`.
3. If `exists: false`, upload the audio via
   `upload_delf_asset(kind="audio", filename=…, content_base64=…)` first.
4. (If the CO exercise also has image options, follow the image steps
   above.)
5. Assemble JSON → validate → save → verify → publish.

### Migrating legacy/PNG image assets

Use this when an existing paper has image refs like
`assets/tp01-q1-a.png` or `assets/tp01-q1-a.webp` and you want the standard
structured WebP layout:
`assets/{test_id}/qNN/{label}.webp`.

1. Run a dry run:

   ```text
   Use the delf-ingest MCP server.
   Call migrate_delf_legacy_assets for A2 / tout-public-a2 / CO / tp-04.
   Set dry_run=true.
   ```

2. Review every `planned` entry. Check that each `from` and `to` mapping is
   correct.
3. Write the migration:

   ```text
   Call migrate_delf_legacy_assets again.
   Set dry_run=false and confirm_write=true.
   Keep overwrite=false unless replacing existing structured files is intended.
   ```

4. Call `verify_delf_asset_references` for the same paper content if you want
   an extra manual check. Publishing also runs this verification.

The migration is non-destructive: it copies or converts assets and updates JSON
refs, but does not delete the old flat or PNG asset files.

Do not publish in the same prompt unless you explicitly want to skip manual
preview. The safest default is save draft, inspect preview, then publish.

### Editing or removing an existing draft

1. Call `list_delf_drafts` to find the `draft_id`.
2. Call `get_delf_draft(draft_id)` to inspect the persisted content.
3. To edit: modify the returned content, then call `update_delf_draft(draft_id,
   content)`. The validation runs again before the GitHub write.
4. To remove: call `delete_delf_draft(draft_id, confirm_delete=true)`. Pass
   `delete_github_file=true` if you also want the JSON file removed.

### Publishing a reviewed draft

1. Call `get_delf_draft(draft_id)` to fetch the persisted GitHub content.
2. Confirm the returned `validation.valid` value is true.
3. Call `publish_delf_draft(draft_id=draft_id, confirm_publish=true)`.
4. Open the returned `student_url` and confirm it appears in the learner view.

## 8. Standard Prompts

Use these prompts as templates. Replace bracketed values like `<draft_id>` and
`<paste JSON>`.

### General Ingestion Prompt

Use this when you want the agent to choose the right MCP tools and stop at a
safe review point.

```text
Use the delf-ingest MCP server.

Task:
1. Validate the DELF content.
2. If it is invalid, explain the validation errors and suggest the minimal JSON fixes.
3. If it is valid, suggest the next safe test_id for <LEVEL> / <VARIANT> / <SECTION>.
4. Replace content.test_id with the suggested ID.
5. Save it as a draft only after validation passes.
6. Print the draft_id, github_path, and preview_url.
7. Do not publish unless I explicitly ask you to publish.
8. Do not save if any referenced image asset looks missing or inconsistent.

Content:
<paste JSON>
```

### Validate Content

Use this when you only want schema/business-rule feedback.

```text
Use the delf-ingest MCP server to validate this DELF content.
Do not save anything and do not suggest a test_id.

Return:
- whether it is valid
- the summary if valid
- the exact validation errors if invalid

Content:
<paste JSON>
```

Tool used: `validate_delf_content`

### Suggest Test ID

Use this before creating a new paper.

```text
Use the delf-ingest MCP server to suggest the next test_id for:

Level: <LEVEL>
Variant: <VARIANT>
Section: <SECTION>
Optional title: <TITLE>

Read both GitHub and DB metadata. Do not save anything.

Return:
- suggested_test_id
- naming convention
- existing GitHub IDs
- existing DB records
```

Tool used: `suggest_delf_test_id`

### Save New Draft

Use this after validation and ID suggestion.

```text
Use the delf-ingest MCP server to save this DELF content as a draft.

Scope:
- Level: <LEVEL>
- Variant: <VARIANT>
- Section: <SECTION>

Rules:
1. Validate first.
2. Refuse to save if validation fails.
3. Refuse to save if content.test_id already exists in GitHub or DB.
4. Return draft_id, github_path, and preview_url.
5. Do not publish.

Content:
<paste JSON>
```

Tool used: `save_delf_draft`

### List Drafts

Use this to find drafts before editing, deleting, or publishing.

```text
Use the delf-ingest MCP server to list DELF drafts.

Filters:
- Level: <LEVEL or omit>
- Variant: <VARIANT or omit>
- Section: <SECTION or omit>
- Limit: <LIMIT, default 50>

Return the drafts newest first with draft_id, test_id, level, variant, section,
exercise_count, github_path, and created_at.
```

Tool used: `list_delf_drafts`

### Get Draft

Use this before editing or publishing.

```text
Use the delf-ingest MCP server to get draft <draft_id>.

Fetch the persisted JSON from GitHub, re-validate it, and return:
- metadata
- content
- validation result
- preview_url

Do not update, delete, or publish anything.
```

Tool used: `get_delf_draft`

### Update Draft

Use this after previewing a draft and fixing its JSON.

```text
Use the delf-ingest MCP server to update draft <draft_id> with this content.

Rules:
1. Validate the new content first.
2. Refuse to update if validation fails.
3. Refuse to update if content.test_id does not match the existing draft test_id.
4. Refuse to update if the paper is not in draft status.
5. Return the updated draft_id, github_path, and preview_url.
6. Do not publish.

Content:
<paste JSON>
```

Tool used: `update_delf_draft`

### Publish Draft

Use this only after manual preview is done.

```text
Use the delf-ingest MCP server to publish draft <draft_id>.

Set confirm_publish=true.
Before publishing, re-fetch the persisted GitHub JSON and re-validate it.
If validation fails, report the errors and do not publish.

Return:
- draft_id
- test_id
- status
- student_url
```

Tool used: `publish_delf_draft`

Alternative when `draft_id` is not known:

```text
Use the delf-ingest MCP server to publish this DELF draft:

test_id: <TEST_ID>
level: <LEVEL>
variant: <VARIANT>
section: <SECTION>

Set confirm_publish=true. Re-validate persisted GitHub content before publishing.
```

### Delete Draft

Use this only for drafts that should be removed.

```text
Use the delf-ingest MCP server to delete draft <draft_id>.

Set confirm_delete=true.
delete_github_file=<true or false>

Rules:
1. Delete only if the paper status is draft.
2. If delete_github_file=false, preserve the GitHub JSON file.
3. If delete_github_file=true, remove the GitHub JSON file too.
4. Return whether the DB row was deleted and whether the GitHub file was deleted.
```

Tool used: `delete_delf_draft`

## 9. Current GitHub Layout

The MCP follows this layout:

```text
delf/
  a2/
    tout-public-a2/
      CE/
        tp/
          tp-01.json
          tp-02.json
        assets/
          tp-02/
            q01/
              a.webp
              b.webp
              c.webp
      CO/
        tp/
        assets/
          tp-01/
            q04/
              a.webp
        audio/
          DELF_TP_A2_Piste05.mp3
```

Inside JSON, image options should use relative paths:

```json
{
  "label": "a",
  "img_url": "assets/tp-02/q01/a.webp",
  "desc": "Un pantalon"
}
```

Legacy flat image refs such as `assets/tp01-q1-a.png` still verify and
publish, but new MCP-generated assets use structured per-paper WebP paths.
That makes ownership clear, avoids filename collisions, and allows a single
paper's assets to be migrated or cleaned up without scanning a crowded
section-level directory.

## 10. Known Limitations

- No PDF page extraction yet — the agent has to paste page screenshots.
- No image transforms beyond crop + WebP (no resize, rotation, stitching).
- No OCR inside the MCP — the agent's native vision does the reading.
- No audio transcription / TTS / speech-to-text.
- `update_delf_draft` does not support renaming a draft's `test_id` — delete
  and re-save instead.
- `delete_delf_draft` and `publish_delf_draft` operate on a single paper at a
  time; no bulk operations.
- Asset garbage collection (orphan `assets/*.webp` files) is not exposed
  through MCP yet; cleanup is manual via `delete_delf_draft` with
  `delete_github_file=true` or via a future cleanup tool.
- Audio convention map currently covers A2 and B1 only; other levels fall
  back to the default uppercase template and will report `exists=false`
  until the convention is added in
  `scripts/delf_mcp/assets/audio_naming.py`.

## Troubleshooting

- `ModuleNotFoundError: src`: make sure `cwd` points to `backend/`.
- `ModuleNotFoundError: mcp`: run
  `uv pip install -r requirements-delf-mcp.txt` from `backend/`.
- `Install backend/requirements-delf-local.txt`: install OpenCV + Pillow:
  `uv pip install -r requirements-delf-local.txt` (needed for
  `crop_screenshot_to_webp`, `process_screenshot_options`, and PNG/JPG/JPEG
  conversion in `migrate_delf_legacy_assets`).
- GitHub or DB errors: check `backend/.env`.
- Duplicate ID error: call `suggest_delf_test_id`, update `content.test_id`,
  then retry.
- `Publishing requires explicit confirmation`: pass `confirm_publish=true`.
- `Deletion requires explicit confirmation`: pass `confirm_delete=true`.
- `Refusing to publish: referenced assets are missing`: the publish path
  invokes `verify_delf_asset_references`. Upload the missing files via
  `process_screenshot_options` or `upload_delf_asset` and retry.
- `File already exists at ...`: pass `overwrite=true` to `upload_delf_asset`
  or `process_screenshot_options` to replace.
- `Payload too large`: bump `DELF_MCP_MAX_ASSET_MB` in your `.env` (default 20).
- `Refusing to update paper ... status is 'active'`: only drafts are mutable
  through `update_delf_draft`.
- New MCP config not detected: restart Claude Code or Codex.
