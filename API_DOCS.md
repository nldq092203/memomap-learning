# MemoMap Learning API Documentation

## Overview

The Learning API serves both **Web Application** and **Chrome Extension** clients with a clean separation of concerns.

```
Base URL: /api
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │   Web App       │              │ Chrome Extension │           │
│  └────────┬────────┘              └────────┬────────┘           │
└───────────┼────────────────────────────────┼────────────────────┘
            │                                │
┌───────────┼────────────────────────────────┼────────────────────┐
│           │       API Layer                │                     │
│  ┌────────▼────────┐   ┌─────────────┐   ┌▼────────────┐        │
│  │  /api/auth/*    │   │  /api/web/* │   │ /api/ext/*  │        │
│  │  (Shared Auth)  │   │ (Full API)  │   │ (Limited)   │        │
│  └─────────────────┘   └──────┬──────┘   └──────┬──────┘        │
└────────────────────────────────┼────────────────┼───────────────┘
                                 │                │
┌────────────────────────────────┼────────────────┼───────────────┐
│                      Domain Layer (Shared)      │                │
│  ┌──────────────────────────────────────────────┘               │
│  │  Controllers │ Services │ DB Queries                         │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                      Infrastructure                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ PostgreSQL  │    │    Redis    │    │  Gemini AI  │          │
│  │   (Data)    │    │   (Cache)   │    │  (AI Chat)  │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

All endpoints (except health check) require **JWT Bearer Token** authentication.

```
Authorization: Bearer <jwt_token>
```

### Authentication Flow

#### For Chrome Extension:
```
1. Extension → Google OAuth → Google ID/Access Token
2. Extension → POST /api/auth/token { id_token OR access_token } → JWT Token
3. Extension → /api/ext/* with Bearer JWT
```

#### For Web App:
```
1. Web App → Google OAuth → Google ID/Access Token
2. Web App → POST /api/auth/token { id_token OR access_token } → JWT Token
3. Web App → /api/web/* with Bearer JWT
```

---

## API Endpoints

### 🔐 Auth (`/api/auth/*`) — Shared by Web & Extension

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/token` | ❌ | Exchange Google token for JWT token |
| GET | `/auth/verify` | ✅ | Verify JWT token validity |
| GET | `/auth/me` | ✅ | Get current user info |
| POST | `/auth/init` | ✅ | Initialize user space (no-op) |

---

#### `POST /api/auth/token`

Exchange a verified Google OAuth token for a JWT token. Creates user if not exists.

**Request:**
```json
{
  "id_token": "google_id_token",
  "access_token": "google_access_token" // optional alternative
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "uuid-string",
    "email": "user@example.com"
  }
}
```

---

#### `GET /api/auth/verify`

Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "sub": "user_id",
      "email": "user@example.com"
    }
  }
}
```

---

#### `GET /api/auth/me`

Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-string",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 🌐 Web API (`/api/web/*`) — Full Functionality

#### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/web/sessions` | List learning sessions |
| POST | `/web/sessions` | Create new session |
| GET | `/web/sessions/{id}` | Get session by ID |

---

##### `GET /api/web/sessions`

List learning sessions with optional filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `limit` | int | 20 | Max results |
| `offset` | int | 0 | Pagination offset |
| `day` | string | - | Filter by day (YYYY-MM-DD) |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "language": "fr",
        "name": "French Practice",
        "duration_seconds": 1800,
        "tags": ["grammar"],
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

---

##### `POST /api/web/sessions`

Create a new learning session.

**Request:**
```json
{
  "language": "fr",
  "name": "French Practice",
  "duration_seconds": 1800,
  "tags": ["grammar", "podcast"],
  "extra": {}
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "language": "fr",
    "name": "French Practice",
    "duration_seconds": 1800,
    "tags": ["grammar", "podcast"],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Transcripts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/web/transcripts` | List transcripts |
| POST | `/web/transcripts` | Create transcript |
| GET | `/web/transcripts/{id}` | Get transcript |
| PUT | `/web/transcripts/{id}` | Update transcript |
| DELETE | `/web/transcripts/{id}` | Delete transcript |

---

##### `POST /api/web/transcripts`

Create a new transcript.

**Request:**
```json
{
  "language": "fr",
  "source_url": "https://youtube.com/watch?v=...",
  "transcript": "Full transcript text...",
  "notes": ["Key point 1", "Key point 2"],
  "tags": ["podcast", "news"],
  "lesson_audio_folder_id": "drive_folder_id",
  "extra": {}
}
```

---

#### Vocabulary (with SRS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/web/vocab` | List vocabulary cards |
| POST | `/web/vocab` | Create vocabulary card |
| GET | `/web/vocab/{id}` | Get vocabulary card |
| PATCH | `/web/vocab/{id}` | Update vocabulary card |
| DELETE | `/web/vocab/{id}` | Soft delete (suspend) card |
| DELETE | `/web/vocab/{id}/hard` | Permanently delete card |
| GET | `/web/vocab/due` | Get due cards for review |
| POST | `/web/vocab:review-batch` | Submit batch review |
| GET | `/web/vocab/stats` | Get vocabulary statistics |

---

##### `GET /api/web/vocab`

List vocabulary cards with optional filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination offset |
| `q` | string | - | Search query |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "language": "fr",
        "word": "bonjour",
        "translation": "hello",
        "notes": ["Used in formal settings"],
        "tags": ["greetings"],
        "srs_level": 3,
        "ease_factor": 2.5,
        "next_review": "2024-01-20T10:00:00Z",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

##### `POST /api/web/vocab`

Create a new vocabulary card.

**Request:**
```json
{
  "language": "fr",
  "word": "bonjour",
  "translation": "hello",
  "notes": ["Used in formal settings"],
  "tags": ["greetings"],
  "extra": {}
}
```

---

##### `GET /api/web/vocab/due`

Get vocabulary cards due for review (SRS).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `limit` | int | 20 | Max cards to return |

**Response:**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "uuid",
        "word": "bonjour",
        "translation": "hello",
        "srs_level": 3,
        "last_reviewed": "2024-01-15T10:00:00Z"
      }
    ],
    "count": 15
  }
}
```

---

##### `POST /api/web/vocab:review-batch`

Submit batch review results (SRS grades).

**Request:**
```json
{
  "reviews": [
    { "card_id": "uuid-1", "grade": "good" },
    { "card_id": "uuid-2", "grade": "again" },
    { "card_id": "uuid-3", "grade": "easy" }
  ]
}
```

**Grades:** `again`, `hard`, `good`, `easy`

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "results": [
      { "card_id": "uuid-1", "next_review": "2024-01-18T10:00:00Z" },
      { "card_id": "uuid-2", "next_review": "2024-01-16T10:00:00Z" },
      { "card_id": "uuid-3", "next_review": "2024-01-25T10:00:00Z" }
    ]
  }
}
```

---

##### `GET /api/web/vocab/stats`

Get vocabulary statistics.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |

**Response:**
```json
{
  "success": true,
  "data": {
    "total_cards": 150,
    "cards_by_level": {
      "0": 10,
      "1": 25,
      "2": 40,
      "3": 35,
      "4": 25,
      "5": 15
    },
    "due_today": 12,
    "reviewed_today": 8
  }
}
```

---

#### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/web/analytics` | Get learning analytics |

---

##### `GET /api/web/analytics`

Get learning analytics summary.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `days` | int | 30 | Days to include |

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sessions": 45,
    "total_duration_hours": 22.5,
    "total_vocab_cards": 150,
    "cards_reviewed_30d": 320,
    "sessions_by_day": [
      { "date": "2024-01-15", "count": 2, "duration": 3600 }
    ],
    "languages": ["fr", "es"]
  }
}
```

---

#### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/web/ai/explain` | Explain text with AI |
| POST | `/web/ai/chat` | Chat with AI tutor |

---

##### `POST /api/web/ai/explain`

Get AI explanation for text.

**Request:**
```json
{
  "text": "Je voudrais un café, s'il vous plaît",
  "language": "fr",
  "context": "At a restaurant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "This phrase means 'I would like a coffee, please'...",
    "breakdown": [
      { "word": "voudrais", "meaning": "would like", "grammar": "conditional" }
    ]
  }
}
```

---

##### `POST /api/web/ai/chat`

Chat with AI language tutor.

**Request:**
```json
{
  "message": "How do I use the subjunctive in French?",
  "language": "fr",
  "conversation_id": "conv-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "The subjunctive mood in French is used to express...",
    "conversation_id": "conv-uuid"
  }
}
```

---

#### Numbers Dictation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/web/numbers/sessions` | Create dictation session |
| GET | `/web/numbers/sessions/{id}/next` | Get next exercise |
| POST | `/web/numbers/sessions/{id}/answer` | Submit answer |
| GET | `/web/numbers/sessions/{id}/summary` | Get session summary |
| GET | `/web/numbers/audio/{ref}` | Stream audio file |

---

##### `POST /api/web/numbers/sessions`

Create a new numbers dictation session.

**Request:**
```json
{
  "language": "fr",
  "difficulty": "medium",
  "count": 10
}
```

**Difficulties:** `easy`, `medium`, `hard`

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "language": "fr",
    "difficulty": "medium",
    "total_exercises": 10
  }
}
```

---

#### Numbers Dictation (Admin) — Azure TTS + Drive staging

These endpoints keep the original **admin-only** dataset generation workflow:
- Generate exercises with **Gemini** (sentence generation) + **Azure TTS** (audio)
- Persist `manifest.json` + audio files to **Google Drive**

**Required headers (in addition to JWT):**

```
X-Admin-Token: <NUMBERS_ADMIN_TOKEN>
X-Google-Access-Token: <google_oauth_access_token_with_drive_scope>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/web/numbers/admin/datasets` | Generate a new dataset version in Drive |
| GET | `/web/numbers/admin/datasets` | List available dataset versions (Drive) |
| POST | `/web/numbers/admin/manifests:cleanup` | Cleanup a Drive manifest (remove bad items) |

---

#### Audio Lessons (Drive-backed)

Audio lessons are stored in Google Drive under:

```
MemoMap/LearningTracker/AudioLessons/<lesson_id>/
  - audio.<ext>
  - transcript.json
```

**Required headers (in addition to JWT):**

```
X-Google-Access-Token: <google_oauth_access_token_with_drive_scope>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/web/audio-lessons` | List audio lessons (Drive query by appProperties) |
| POST | `/web/audio-lessons` | Upload an audio lesson (multipart) |
| GET | `/web/audio-lessons/{lesson_id}/transcript` | Get transcript.json |
| GET | `/web/audio-lessons/{lesson_id}/audio` | Stream audio bytes |

---

### 🧩 Extension API (`/api/ext/*`) — Limited Functionality

The Extension API provides a subset of Web API for Chrome Extension.

#### Vocabulary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ext/vocab` | List vocabulary cards |
| POST | `/ext/vocab` | Create vocabulary card |
| PUT | `/ext/vocab/{id}` | Update vocabulary card |

---

##### `GET /api/ext/vocab`

List vocabulary cards (simplified).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | - | Filter by language |
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination offset |

---

##### `POST /api/ext/vocab`

Create vocabulary card from extension.

**Request:**
```json
{
  "language": "fr",
  "word": "bonjour",
  "translation": "hello",
  "notes": ["Heard in a video"],
  "tags": ["extension"],
  "extra": {
    "source_url": "https://youtube.com/..."
  }
}
```

---

##### `PUT /api/ext/vocab/{card_id}`

Update vocabulary card.

**Request:**
```json
{
  "translation": "hello / good morning",
  "notes": ["Updated note"],
  "tags": ["greetings", "formal"]
}
```

---

#### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ext/ai/explain` | Explain selected text |
| POST | `/ext/ai/chat` | Chat with AI tutor |

Same request/response format as Web API.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Rate Limiting (AI Endpoints)

AI endpoints have rate limits per user:

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded: minute",
    "scope": "minute",
    "retry_after": 45
  }
}
```

**Headers:**
```
Retry-After: 45
```

---

## Health Check

```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "OK"
}
```

---

## Chrome Extension Integration

### Recommended Flow

```javascript
// 1. After Google OAuth login
const googleUser = await chrome.identity.getAuthToken({ interactive: true });

// 2. Exchange for JWT
const response = await fetch('https://api.memomap.app/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: googleUser.email })
});
const { data: { token } } = await response.json();

// 3. Store token
await chrome.storage.local.set({ jwt: token });

// 4. Use token for API calls
const vocab = await fetch('https://api.memomap.app/api/ext/vocab', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Quick Add Vocabulary

```javascript
// Add word from context menu selection
async function addVocabulary(word, context) {
  const { jwt } = await chrome.storage.local.get('jwt');
  
  await fetch('https://api.memomap.app/api/ext/vocab', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language: 'fr',
      word: word,
      notes: [context],
      extra: { source_url: window.location.href }
    })
  });
}
```

---

## Response Headers

All responses include:

| Header | Description |
|--------|-------------|
| `X-Response-Time` | Request processing time |
| `Content-Type` | Always `application/json` |

---

## Summary

| API | Prefix | Target | Features |
|-----|--------|--------|----------|
| Auth | `/api/auth` | Both | Token, verify, user info |
| Web | `/api/web` | Web App | Full CRUD, SRS, Analytics, AI, Numbers |
| Extension | `/api/ext` | Chrome Ext | Vocab (GET/POST/PUT), AI |
