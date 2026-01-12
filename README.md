# MemoMap Learning Backend

Unified documentation for the MemoMap Learning backend:
- High‑level overview & setup
- Authentication and login flow
- Main API surface (web + extension)
- End‑to‑end flows as Mermaid diagrams

---

## 1. Overview

The Learning API serves both the **Web Application** and the **Chrome Extension** through a single backend.

- 📚 Vocabulary flashcards with SRS (Spaced Repetition System)  
- ⏱️ Learning sessions tracking  
- 📝 Transcripts and notes  
- 🔢 Numbers dictation exercises  
- 🤖 AI‑powered explanations and chat  

Tech stack:
- Python + Flask
- PostgreSQL (data), Redis (cache / rate limiting)
- JWT for authentication
- Google Gemini for AI features

**Base URL:** `/api`

Project structure (high level):

```text
src/
├── api/              # HTTP Layer (views, auth)
├── domain/           # Business Logic (controllers, services)
├── infra/            # Infrastructure (DB, Redis, AI, JWT)
├── shared/           # Shared Features (AI, Numbers)
└── utils/            # Utilities
```

See `STRUCTURE.md` for a deeper breakdown of modules and packages.

---

## 2. Getting Started

Backend root: this directory.

### 2.1. Environment

Required environment variables (non‑exhaustive):

| Variable         | Description      |
|------------------|------------------|
| `SECRET_KEY`     | Flask secret     |
| `POSTGRES_DSN`   | PostgreSQL DSN   |
| `REDIS_URL`      | Redis URL        |
| `GEMINI_API_KEY` | Gemini API key   |

See `src/config.py` and `.env.example` (if present) for the full list.

### 2.2. Install & Run (uv)

Using `uv` (recommended):

```bash
# Install dependencies
uv sync

# Run the app
uv run python run.py
```

Or with plain `pip`:

```bash
pip install -r requirements.txt
alembic upgrade head
python run.py
```

---

## 3. Architecture (High Level)

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   Web App       │              │ Chrome Extension│          │
│  └────────┬────────┘              └────────┬────────┘          │
└───────────┼────────────────────────────────┼───────────────────┘
            │                                │
┌───────────┼────────────────────────────────┼───────────────────┐
│           │       API Layer                │                   │
│  ┌────────▼────────┐   ┌─────────────┐   ┌▼────────────┐      │
│  │  /api/auth/*    │   │  /api/web/* │   │ /api/ext/*  │      │
│  │  (Shared Auth)  │   │ (Full API)  │   │ (Limited)   │      │
│  └─────────────────┘   └──────┬──────┘   └──────┬──────┘      │
└────────────────────────────────┼────────────────┼─────────────┘
                                 │                │
┌────────────────────────────────┼────────────────┼─────────────┐
│                      Domain Layer (Shared)      │             │
│  Controllers │ Services │ DB Queries                         │
└───────────────────────────────────────────────────────────────┘
            │
┌───────────▼───────────────────────────────────────────────────┐
│                      Infrastructure                           │
│  PostgreSQL │ Redis │ Gemini │ Numbers Dictation │ Drive      │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication & Login

All non‑health endpoints require a **JWT Bearer Token**:

```http
Authorization: Bearer <jwt>
```

### 4.1. Login Flow (Web + Extension)

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App / Extension
    participant API as Learning API (/api)
    participant Google as Google OAuth
    participant DB as PostgreSQL

    User->>Web: Click "Continue with Google"
    Web->>Google: Start Google OAuth flow
    Google-->>Web: Return id_token / access_token

    Web->>API: POST /api/auth/token { id_token or access_token }
    API->>Google: Verify token via tokeninfo
    Google-->>API: Valid token info (email, sub, aud)

    API->>DB: Get or create User by email
    DB-->>API: User record

    API-->>Web: JWT + user_id + email
    Web->>API: Subsequent /api/web/* or /api/ext/* with Authorization: Bearer <JWT>
```

### 4.2. Auth Endpoints

All under `/api/auth/*`:

| Method | Endpoint       | Auth | Description                                   |
|--------|----------------|------|-----------------------------------------------|
| POST   | `/auth/token`  | ❌   | Exchange Google token for app JWT            |
| GET    | `/auth/verify` | ✅   | Verify JWT token validity                    |
| GET    | `/auth/me`     | ✅   | Get current authenticated user info          |
| POST   | `/auth/init`   | ✅   | No‑op init; kept for extension compatibility |

**`POST /api/auth/token` (summary)**  
Request body:

```json
{
  "id_token": "google_id_token",
  "access_token": "google_access_token" // optional alternative
}
```

On success, returns:

```json
{
  "status": "success",
  "data": {
    "token": "<jwt>",
    "user_id": "uuid-string",
    "email": "user@example.com"
  }
}
```

Use the `token` value as the Bearer token in all subsequent calls.

---

## 5. Web API Surface (`/api/web/*`)

### 5.1. Sessions

| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| GET    | `/web/sessions`      | List learning sessions   |
| POST   | `/web/sessions`      | Create new session       |
| GET    | `/web/sessions/{id}` | Get session by ID        |

### 5.2. Transcripts

| Method | Endpoint                 | Description               |
|--------|--------------------------|---------------------------|
| GET    | `/web/transcripts`       | List transcripts          |
| POST   | `/web/transcripts`       | Create transcript         |
| GET    | `/web/transcripts/{id}`  | Get transcript            |
| PUT    | `/web/transcripts/{id}`  | Update transcript         |
| DELETE | `/web/transcripts/{id}`  | Delete transcript         |

### 5.3. Vocabulary (with SRS)

| Method | Endpoint                    | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | `/web/vocab`                | List vocabulary cards           |
| POST   | `/web/vocab`                | Create vocabulary card          |
| GET    | `/web/vocab/{id}`           | Get vocabulary card             |
| PATCH  | `/web/vocab/{id}`           | Update vocabulary card          |
| DELETE | `/web/vocab/{id}`           | Soft delete (suspend) card      |
| DELETE | `/web/vocab/{id}/hard`      | Permanently delete card         |
| GET    | `/web/vocab/due`            | Get due cards for review        |
| POST   | `/web/vocab:review-batch`   | Submit batch review results     |
| GET    | `/web/vocab/stats`          | Get vocabulary statistics       |

### 5.4. AI (Web)

| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| POST   | `/web/ai/explain`  | Explain text with AI     |
| POST   | `/web/ai/chat`     | Chat with AI tutor       |

### 5.5. Numbers Dictation (User)

| Method | Endpoint                             | Description                    |
|--------|--------------------------------------|--------------------------------|
| POST   | `/web/numbers/sessions`             | Create dictation session       |
| GET    | `/web/numbers/sessions/{id}/next`   | Get next exercise              |
| POST   | `/web/numbers/sessions/{id}/answer` | Submit answer                  |
| GET    | `/web/numbers/sessions/{id}/summary`| Get session summary            |
| GET    | `/web/numbers/audio/{ref}`          | Stream audio file              |

### 5.6. Numbers Dictation (Admin)

Admin endpoints (require both JWT and `X-Admin-Token`):

| Method | Endpoint                               | Description                          |
|--------|----------------------------------------|--------------------------------------|
| POST   | `/web/numbers/admin/datasets`         | Generate new dataset in Drive        |
| GET    | `/web/numbers/admin/datasets`         | List available dataset versions      |
| POST   | `/web/numbers/admin/manifests:cleanup`| Cleanup a Drive manifest             |

### 5.7. Analytics

| Method | Endpoint         | Description             |
|--------|------------------|-------------------------|
| GET    | `/web/analytics` | Get learning analytics  |

---

## 6. Extension API Surface (`/api/ext/*`)

Extension endpoints are a subset of the Web API, optimized for the Chrome Extension.

### 6.1. Vocabulary

| Method | Endpoint          | Description                  |
|--------|-------------------|------------------------------|
| GET    | `/ext/vocab`      | List vocabulary cards        |
| POST   | `/ext/vocab`      | Create vocabulary card       |
| PUT    | `/ext/vocab/{id}` | Update vocabulary card       |

### 6.2. AI (Extension)

| Method | Endpoint           | Description               |
|--------|--------------------|---------------------------|
| POST   | `/ext/ai/explain`  | Explain selected text     |
| POST   | `/ext/ai/chat`     | Chat with AI tutor        |

Requests and responses for AI endpoints mirror the Web AI endpoints.

---

## 7. Key Flows (Mermaid)

Below are concrete client→API flows for the main feature areas.

### 7.1. Sessions (Create & List)

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App
    participant API as Learning API (/api/web)
    participant DB as PostgreSQL

    User->>Web: Open "Sessions" page
    Web->>API: GET /api/web/sessions (Bearer JWT, filters)
    API->>DB: Query sessions by user_id + filters
    DB-->>API: List of sessions
    API-->>Web: JSON sessions list
    Web-->>User: Render sessions

    User->>Web: Create new session (form)
    Web->>API: POST /api/web/sessions (Bearer JWT, payload)
    API->>DB: Insert new session for user_id
    DB-->>API: Created session
    API-->>Web: 201 Created + session data
    Web-->>User: Show new session in list
```

### 7.2. Vocabulary (Web)

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App
    participant API as Learning API (/api/web)
    participant DB as PostgreSQL

    User->>Web: Open "Vocabulary" page
    Web->>API: GET /api/web/vocab (Bearer JWT, filters)
    API->>DB: Query vocab cards by user_id + filters
    DB-->>API: Vocab cards
    API-->>Web: JSON vocab list
    Web-->>User: Render vocab table/cards

    User->>Web: Add new word
    Web->>API: POST /api/web/vocab (Bearer JWT, word payload)
    API->>DB: Insert new vocab card for user_id
    DB-->>API: Created card
    API-->>Web: 201 Created + card data
    Web-->>User: Show new card

    User->>Web: Start review session
    Web->>API: GET /api/web/vocab/due (Bearer JWT)
    API->>DB: Fetch due cards for user_id
    DB-->>API: Due cards list
    API-->>Web: JSON due cards

    User->>Web: Submit review grades
    Web->>API: POST /api/web/vocab:review-batch (Bearer JWT, reviews)
    API->>DB: Update SRS fields per card
    DB-->>API: Updated cards
    API-->>Web: JSON review results
    Web-->>User: Show next due cards / stats
```

### 7.3. AI (Explain & Chat)

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App / Extension
    participant API as Learning API (/api/web/ai or /api/ext/ai)
    participant RL as AI Rate Limiter
    participant Gemini as Google Gemini

    User->>Web: Ask for explanation / chat
    Web->>API: POST /api/web/ai/explain or /api/web/ai/chat (Bearer JWT, payload)

    API->>RL: Check user + global AI quotas
    RL-->>API: Allowed / denied
    alt Within quota
        API->>Gemini: Send prompt (text, language, context)
        Gemini-->>API: AI response (explanation / chat message)
        API-->>Web: JSON AI response
        Web-->>User: Render explanation / chat bubble
    else Rate limited
        API-->>Web: 429 Too Many Requests (AI usage limit)
        Web-->>User: Show rate-limit message
    end
```

### 7.4. Numbers Dictation (User)

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App
    participant API as Learning API (/api/web/numbers)
    participant DB as PostgreSQL
    participant CDN as Numbers Audio Storage

    User->>Web: Start numbers dictation
    Web->>API: POST /api/web/numbers/sessions (Bearer JWT, language + difficulty)
    API->>DB: Create numbers session for user_id
    DB-->>API: Session record
    API-->>Web: 201 Created + session_id

    loop For each exercise
        Web->>API: GET /api/web/numbers/sessions/{id}/next (Bearer JWT)
        API->>DB: Fetch next exercise metadata
        DB-->>API: Exercise + audio ref
        API-->>Web: JSON exercise + audio ref

        Web->>CDN: GET /api/web/numbers/audio/{ref}
        CDN-->>Web: Audio bytes (number spoken)

        User->>Web: Submit answer
        Web->>API: POST /api/web/numbers/sessions/{id}/answer (Bearer JWT, answer)
        API->>DB: Store answer + correctness
        DB-->>API: Updated progress
        API-->>Web: Result (correct/incorrect, next state)
    end

    Web->>API: GET /api/web/numbers/sessions/{id}/summary (Bearer JWT)
    API->>DB: Compute summary for session
    DB-->>API: Summary stats
    API-->>Web: JSON summary
    Web-->>User: Show session results
```

---

## 8. Error Shape

All errors follow the standard API error shape:

```json
{
  "status": "error",
  "message": "Human-readable error message"
}
```

HTTP status codes:

| Code | Meaning                         |
|------|---------------------------------|
| 200  | Success                         |
| 201  | Created                         |
| 204  | No Content (successful delete)  |
| 400  | Bad Request (validation error)  |
| 401  | Unauthorized (missing/invalid)  |
| 404  | Not Found                       |
| 429  | Too Many Requests (rate limit)  |
