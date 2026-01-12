# MemoMap Learning Backend - Project Structure

```
memomap-learning-backend/
├── api/                           # Vercel serverless entry
│   ├── index.py                   # Main entry point
│   └── requirements.txt           # Dependencies
│
├── src/
│   ├── __init__.py                # Flask app factory
│   ├── config.py                  # Configuration
│   ├── extensions.py              # Flask extensions (CORS, Logger)
│   │
│   ├── api/                       # 🌐 API Layer
│   │   ├── __init__.py            # Blueprint registration
│   │   ├── decorators.py          # @require_auth, @with_db
│   │   ├── errors.py              # Error handlers
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   │
│   │   ├── auth/                  # /api/auth/* (Shared)
│   │   │   └── __init__.py        # token, verify, me, init
│   │   │
│   │   ├── web/                   # /api/web/* (Full Web API)
│   │   │   ├── __init__.py        # web_bp blueprint
│   │   │   ├── sessions.py        # Sessions CRUD
│   │   │   ├── transcripts.py     # Transcripts CRUD
│   │   │   ├── vocab.py           # Vocabulary CRUD + SRS
│   │   │   ├── analytics.py       # Learning analytics
│   │   │   ├── ai.py              # AI explain/chat
│   │   │   └── numbers.py         # Numbers dictation
│   │   │
│   │   └── ext/                   # /api/ext/* (Extension API)
│   │       ├── __init__.py        # ext_bp blueprint
│   │       ├── vocab.py           # Vocabulary (get/post/put)
│   │       └── ai.py              # AI explain/chat
│   │
│   ├── domain/                    # 💼 Domain Layer (Business Logic)
│   │   ├── __init__.py
│   │   ├── controllers.py         # Business logic orchestration
│   │   ├── db_queries.py          # Database query helpers
│   │   ├── errors.py              # Domain exceptions
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── srs.py             # Spaced Repetition System (FSRS)
│   │       └── analytics.py       # Analytics calculations
│   │
│   ├── infra/                     # 🔧 Infrastructure Layer
│   │   ├── __init__.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py      # SQLAlchemy session management
│   │   │   └── orm.py             # ORM models (User, Session, etc.)
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   └── client.py          # Redis client
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── client.py          # Gemini AI client
│   │   │   └── rate_limiter.py    # AI rate limiting
│   │   └── auth/
│   │       ├── __init__.py
│   │       └── jwt.py             # JWT create/decode
│   │
│   ├── shared/                    # 🔄 Shared Features
│   │   ├── __init__.py
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── service.py         # AI chat/explain service
│   │   │   └── rate_limit.py      # Rate limiting logic
│   │   └── numbers/
│   │       ├── __init__.py
│   │       └── engine.py          # Numbers dictation engine
│   │
│   └── utils/                     # 🛠️ Utilities
│       ├── __init__.py
│       ├── response_builder.py    # Standard API response builder
│       ├── constants.py           # Learning languages, etc.
│       └── datetime_utils.py      # Date/time helpers
│
├── API_DOCS.md                    # 📚 API Documentation
├── STRUCTURE.md                   # This file
├── README.md                      # Project overview
└── requirements.txt               # Python dependencies
```

## Layer Responsibilities

### API Layer (`src/api/`)
- HTTP request/response handling
- Input validation (Pydantic schemas)
- Authentication (JWT decorators)
- Route registration

### Domain Layer (`src/domain/`)
- Business logic (controllers)
- Data access (db_queries)
- Domain services (SRS, Analytics)
- Domain exceptions

### Infrastructure Layer (`src/infra/`)
- Database connections (PostgreSQL)
- External services (Redis, Gemini AI)
- JWT handling
- ORM models

### Shared Layer (`src/shared/`)
- Features shared between web and extension
- AI service with chat history (Redis-backed)
- Numbers dictation engine (in-memory)

## API Structure

```
/api
├── /auth              # Authentication (shared)
│   ├── POST /token    # Get JWT from email
│   ├── GET  /verify   # Verify JWT
│   ├── GET  /me       # Current user info
│   └── POST /init     # Initialize user space
│
├── /web               # Full Web API
│   ├── /sessions      # Learning sessions
│   ├── /transcripts   # Transcripts
│   ├── /vocab         # Vocabulary + SRS
│   ├── /analytics     # Learning analytics
│   ├── /ai            # AI features
│   └── /numbers       # Numbers dictation
│   └── /audio-lessons # Drive-backed audio lessons
│
└── /ext               # Extension API (limited)
    ├── /vocab         # Vocabulary (GET/POST/PUT)
    └── /ai            # AI explain/chat
```

## Drive-backed flows kept in Learning backend

Some learning features intentionally remain **Drive-backed**:

- **Audio Lessons**: stored in Google Drive (`MemoMap/LearningTracker/AudioLessons/...`)
- **Numbers Dictation (Admin create)**: dataset generation uses **Gemini + Azure TTS** and writes to Drive (staging)

These endpoints require an additional header:

```
X-Google-Access-Token: <google_oauth_access_token_with_drive_scope>
```

Numbers admin endpoints additionally require:

```
X-Admin-Token: <NUMBERS_ADMIN_TOKEN>
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│    View     │────▶│ Decorator   │
│ (HTTP/JSON) │     │ (api/web)   │     │ (@require_  │
└─────────────┘     └─────────────┘     │  auth)      │
                                        └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │  Controller │◀───────────┘
                    │ (domain/    │
                    │ controllers)│
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ DB Query │    │ Service  │    │  Shared  │
    │ (domain/ │    │ (domain/ │    │ (shared/ │
    │ db_query)│    │ services)│    │  ai/)    │
    └────┬─────┘    └──────────┘    └────┬─────┘
         │                               │
         ▼                               ▼
    ┌──────────┐                   ┌──────────┐
    │PostgreSQL│                   │  Redis   │
    └──────────┘                   └──────────┘
```

## Authentication Flow

### Web App
```
1. Web App → Google OAuth → Google ID/Access Token
2. Web App → POST /api/auth/token { id_token OR access_token } → JWT
3. Web App → /api/web/* (Authorization: Bearer JWT)
```

### Chrome Extension
```
1. Extension → chrome.identity.getAuthToken() / Google OAuth → Google ID/Access Token
2. Extension → POST /api/auth/token { id_token OR access_token } → JWT
3. Extension → /api/ext/* (Authorization: Bearer JWT)
```
