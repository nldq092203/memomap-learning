# MemoMap Learning Backend

Unified API for **Web** and **Chrome Extension** clients.

## Features

- 📚 **Vocabulary flashcards** with SRS (Spaced Repetition System)
- ⏱️ **Learning sessions** tracking
- 📝 **Transcripts** and notes
- 🔢 **Numbers dictation** exercises
- 🤖 **AI-powered** explanations and chat

## Tech Stack

- **Python 3.11+** with Flask
- **PostgreSQL** for data persistence
- **Redis** for caching and chat history
- **JWT** for authentication
- **Google Gemini** for AI features

## Project Structure

```
src/
├── api/              # HTTP Layer (views, auth)
├── domain/           # Business Logic (controllers, services)
├── infra/            # Infrastructure (DB, Redis, AI, JWT)
├── shared/           # Shared Features (AI, Numbers)
└── utils/            # Utilities
```

See `STRUCTURE.md` for full architecture.

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Configure
cp .env.example .env

# Migrate
alembic upgrade head

# Run
python run.py
```

## API

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/token` | Get JWT token |
| `GET /api/auth/me` | Get current user |
| `GET/POST /api/learning/sessions` | Sessions |
| `GET/POST /api/learning/vocab` | Vocabulary |
| `GET/POST /api/learning/transcripts` | Transcripts |
| `GET /api/learning/analytics` | Analytics |
| `POST /api/learning/ai/explain` | AI explain |
| `POST /api/learning/ai/chat` | AI chat |
| `POST /api/learning/numbers/sessions` | Numbers dictation |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Flask secret |
| `POSTGRES_DSN` | PostgreSQL DSN |
| `REDIS_URL` | Redis URL |
| `GEMINI_API_KEY` | Gemini API key |

## License

MIT
