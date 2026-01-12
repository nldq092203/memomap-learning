# System Flows (Mermaid Diagrams)

This document shows high-level request flows between clients and the Learning API using Mermaid diagrams.

Each diagram focuses on a specific feature area and follows the path:
**Client → Learning API → External Services (Google, Gemini, Azure, Drive, DB)**.

> Note: All application endpoints (except health check) require a valid JWT from the **Login / Auth** flow.

---

## 1. Login / Auth Flow

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

---

## 2. Sessions Flow (Create & List)

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

---

## 3. Transcripts Flow

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App
    participant API as Learning API (/api/web)
    participant DB as PostgreSQL

    User->>Web: Open "Transcripts" page
    Web->>API: GET /api/web/transcripts (Bearer JWT)
    API->>DB: Query transcripts by user_id
    DB-->>API: Transcript list
    API-->>Web: JSON transcripts
    Web-->>User: Render transcripts

    User->>Web: Create / import transcript
    Web->>API: POST /api/web/transcripts (Bearer JWT, payload)
    API->>DB: Insert transcript for user_id
    DB-->>API: Created transcript
    API-->>Web: 201 Created + transcript data
    Web-->>User: Show transcript details
```

---

## 4. Vocabulary Flow (Web)

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

---

## 5. Vocabulary Flow (Chrome Extension)

```mermaid
sequenceDiagram
    actor User as User
    participant Ext as Chrome Extension
    participant API as Learning API (/api/ext)
    participant DB as PostgreSQL

    User->>Ext: Select text in page
    User->>Ext: Click "Save to Vocab"
    Ext->>API: POST /api/ext/vocab (Bearer JWT, word + context)
    API->>DB: Insert vocab card for user_id (extra.source_url, notes)
    DB-->>API: Created card
    API-->>Ext: 201 Created + card data
    Ext-->>User: Show success / badge

    User->>Ext: Open extension vocab list
    Ext->>API: GET /api/ext/vocab (Bearer JWT, filters)
    API->>DB: Query vocab cards by user_id
    DB-->>API: Cards
    API-->>Ext: JSON cards
    Ext-->>User: Render list in popup
```

---

## 6. AI Flow (Explain & Chat)

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

---

## 7. Numbers Dictation Flow (User)

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

## 8. Numbers Dictation Admin Flow

```mermaid
sequenceDiagram
    actor Admin as Admin User
    participant Web as Admin UI / Tool
    participant API as Learning API (/api/web/numbers/admin)
    participant RL as AI Rate Limiter
    participant Gemini as Google Gemini
    participant Azure as Azure TTS
    participant Drive as Google Drive

    Admin->>Web: Trigger dataset generation
    Web->>API: POST /api/web/numbers/admin/datasets
        Note over Web,API: Headers: Bearer JWT + X-Admin-Token + X-Google-Access-Token

    API->>RL: Check AI quotas
    RL-->>API: Allowed / denied
    alt Within quota
        API->>Gemini: Generate sentences / numbers exercises
        Gemini-->>API: Generated sentences

        loop For each generated item
            API->>Azure: Synthesize audio (text → speech)
            Azure-->>API: Audio bytes
            API->>Drive: Upload manifest.json + audio files
            Drive-->>API: File IDs / confirmation
        end

        API-->>Web: 202 Accepted / success + dataset info
    else Rate limited
        API-->>Web: 429 Too Many Requests
    end

    Admin->>Web: List datasets
    Web->>API: GET /api/web/numbers/admin/datasets (admin headers)
    API->>Drive: Query dataset folder
    Drive-->>API: Dataset list
    API-->>Web: JSON datasets

    Admin->>Web: Cleanup manifest
    Web->>API: POST /api/web/numbers/admin/manifests:cleanup (admin headers)
    API->>Drive: Cleanup manifest entries
    Drive-->>API: Cleanup result
    API-->>Web: JSON cleanup summary
```

---

## 9. Analytics Flow

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web App
    participant API as Learning API (/api/web/analytics)
    participant DB as PostgreSQL

    User->>Web: Open "Analytics" dashboard
    Web->>API: GET /api/web/analytics?language=&days=30 (Bearer JWT)
    API->>DB: Aggregate sessions, vocab, reviews for user_id
    DB-->>API: Aggregated stats
    API-->>Web: JSON analytics (totals, by-day stats)
    Web-->>User: Render charts / stats
```

