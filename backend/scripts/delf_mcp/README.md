# DELF MCP Server

Local MCP server that gives an AI agent the full DELF test-paper ingestion
lifecycle: validate JSON, pick a safe `test_id` from the existing corpus, save
a draft, list/get/update/delete drafts, and publish drafts to active status.

Tools (8 total):

| Tool                    | Purpose                                                          |
|-------------------------|------------------------------------------------------------------|
| `validate_delf_content` | Validate `DelfTestPaper` JSON (schema + DELF business rules).    |
| `suggest_delf_test_id`  | Read DB + GitHub corpus and return the next convention-aware ID. |
| `save_delf_draft`       | Validate, then write `status="draft"` to DB + GitHub.            |
| `list_delf_drafts`      | List drafts (newest first), optional level/section/variant.       |
| `get_delf_draft`        | Return metadata + content from GitHub for one draft.              |
| `update_delf_draft`     | Validate and overwrite an existing draft's JSON.                  |
| `publish_delf_draft`    | Flip a draft to `status="active"`. Requires `confirm_publish`.    |
| `delete_delf_draft`     | Remove a draft. Requires `confirm_delete`. Drafts only.           |

Draft lifecycle support is complete: create, list, read, update, delete, and
publish are all available through MCP tools. The MCP does **not** currently
crop or upload image assets; image files still need to exist in the GitHub
`assets/` folder before the JSON references them.

## 1. Install

From the repo root:

```bash
cd backend
uv sync
uv pip install -r requirements-delf-mcp.txt
```

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

## 7. Most Effective Workflow

### Creating a new paper

1. Build the DELF JSON with a temporary `test_id`, for example `draft`.
2. Call `validate_delf_content`.
3. Fix validation errors until the content is valid.
4. Call `suggest_delf_test_id` with the real `level`, `variant`, and `section`.
5. Replace `content.test_id` with `suggested_test_id`.
6. If the paper uses image options, make sure all `img_url` files already exist
   in GitHub under the section `assets/` folder.
7. Call `save_delf_draft`.
8. Open the returned `preview_url` and visually check the paper.
9. When the paper looks correct, call `publish_delf_draft` with
   `confirm_publish=true`.

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
          tp01-q1-a.webp
      CO/
        tp/
        assets/
        audio/
```

Inside JSON, image options should use relative paths:

```json
{
  "label": "a",
  "img_url": "assets/tp11-q3-a.webp",
  "desc": "Un pantalon"
}
```

## 10. Known Limitations

- No image/PDF cropping tool is exposed through MCP yet.
- No asset upload tool is exposed through MCP yet.
- The MCP does not currently verify every `img_url` exists before saving.
- Audio upload is not exposed through MCP yet.
- `update_delf_draft` does not support renaming a draft's `test_id` — delete
  and re-save instead.
- `delete_delf_draft` and `publish_delf_draft` operate on a single paper at a
  time; no bulk operations.

## Troubleshooting

- `ModuleNotFoundError: src`: make sure `cwd` points to `backend/`.
- `ModuleNotFoundError: mcp`: run
  `uv pip install -r requirements-delf-mcp.txt` from `backend/`.
- GitHub or DB errors: check `backend/.env`.
- Duplicate ID error: call `suggest_delf_test_id`, update `content.test_id`,
  then retry.
- `Publishing requires explicit confirmation`: pass `confirm_publish=true`.
- `Deletion requires explicit confirmation`: pass `confirm_delete=true`.
- `Refusing to update paper ... status is 'active'`: only drafts are mutable
  through `update_delf_draft`. Inspect with `get_delf_draft` or fetch the row
  by `draft_id` to verify.
- New MCP config not detected: restart Claude Code or Codex.
