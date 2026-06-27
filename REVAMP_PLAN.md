# MemoMap Revamp Plan

## Product Direction

MemoMap will be repositioned as a French exercise archive and personal practice workspace.

The product should not feel like a rigid learning-roadmap app. It should feel like a calm, well-organized library of French exercises where logged-in users can choose what to practice, save vocabulary, and keep personal progress across the archive.

Product statement:

> MemoMap is a French practice archive for CO, CE, PO, PE, DELF preparation, vocabulary review, and personal progress tracking.

Primary goals:

- Help users practice French through structured exercises.
- Make real DELF-style content easy to browse and complete.
- Give users a personal workspace based on saved vocabulary and exercise progress.
- Inspire consistent practice without forcing a strict study path.

## Core Scope

Keep only these product pillars:

1. Google OAuth login.
2. Vocabulary and revision.
3. Entrainement by skill:
   - CO: Comprendre les nombres, Videos & Podcasts, DELF Ecoute.
   - CE: DELF Lire, Videos & Podcasts.
   - PO: current pratique orale.
   - PE: future module.
4. Community feedback.
5. Personal exercise progress tracking.

Sunset (in legacy part):

- Transcript/transcription user flow.
- Google Drive requirement during login.
- Study session timer.
- Analytics page as a standalone product feature.
- Sync legacy page.
- Heavy workspace framing.
- Non-core AI assistant surface for the first revamp scope.

## Target Logged-In User Journey

This plan focuses on the logged-in journey. Guest mode remains available, but with limited content.

Logged-in user journey:

1. User logs in with Google OAuth.
2. User lands on Accueil.
3. User sees a map of main practice sections.
4. User chooses a section or resumes an unfinished exercise.
5. User completes an exercise.
6. MemoMap saves the user's progress for that exercise.
7. User saves useful vocabulary from the exercise.
8. User reviews saved vocabulary later.
9. User returns through Accueil, Explore, or Vocabulaire to continue.

The product should answer these user questions quickly:

- What can I practice?
- What did I already start?
- What did I complete?
- What vocabulary should I revise?
- Where can I find more exercises at my level?

## Navigation

Main sidebar items:

- Accueil
- Explore
- Vocabulaire
- Communaute
- Profil

Notes:

- Use "Accueil" instead of "Arcueil".
- CO, CE, PO, and PE should appear as learning sections inside Accueil and Explore, not necessarily as top-level sidebar items.
- This keeps the app feeling like an archive/library rather than a crowded LMS.

Recommended route map:

```txt
/login
/accueil
/explore

/vocabulaire
/vocabulaire/revision

/co
/co/nombres
/co/videos-podcasts
/co/delf-ecoute

/ce
/ce/delf-lire
/ce/videos-podcasts

/po
/po/pratique-orale

/pe

/communaute
/profil
```

Optional detail routes:

```txt
/exercise/:exerciseId
/co/nombres/session/:sessionId
/co/videos-podcasts/:exerciseId
/co/delf-ecoute/:exerciseId
/ce/delf-lire/:exerciseId
/po/pratique-orale/:topicId
```

## Accueil

Purpose:

Accueil is the logged-in home page and personal entry point into the archive.

It should not be a heavy analytics dashboard. It should help users resume practice and understand the main sections.

Core content:

- Greeting.
- Current level selector or user level indicator.
- Continue learning area.
- Main section map:
  - CO
  - CE
  - PO
  - PE
  - Vocabulaire
- Vocabulaire a reviser.
- Recently opened exercises.
- Lightweight progress summary.

Recommended sections:

1. Reprendre
   - Unfinished exercises.
   - Last opened exercise.
   - Last active section.

2. Sections principales
   - CO card.
   - CE card.
   - PO card.
   - PE card.
   - Vocabulaire card.

3. A reviser
   - Due vocabulary count.
   - CTA to Vocabulaire revision.

4. Activite recente
   - Recently completed or opened exercises.

Product rule:

Accueil should always give users a clear next action without forcing a full learning path.

## Explore

Purpose:

Explore is the exercise catalog.

Users come here to browse and discover practice content across the archive.

Filters:

- Skill:
  - CO
  - CE
  - PO
  - PE
- Level:
  - A2
  - B1
  - B2
- Source:
  - DELF
  - Videos & Podcasts
  - Numbers
  - Books
- Status:
  - Not started
  - In progress
  - Completed
  - Retry suggested
- Topic/tag, later.

Exercise cards should show:

- Skill.
- Type/source.
- Level.
- Title.
- Status.
- Score if completed.
- Duration estimate if known.
- Source/book/page if relevant.
- CTA:
  - Start
  - Continue
  - Retry
  - Review

## Vocabulaire

Purpose:

Vocabulaire is the personal saved vocabulary archive and revision system.

Core features:

- View all saved vocabulary.
- Add vocabulary manually.
- Save vocabulary from exercises.
- Edit vocabulary.
- Delete vocabulary.
- Search.
- Filter by source, tag, level, status, due date.
- Review due vocabulary.
- Show SRS status.

Vocabulary item fields:

- Text.
- Type: word or phrase.
- Translation.
- Notes.
- Example sentences.
- Tags.
- Level.
- Source context.
- Review status.
- Next review date.
- Last grade.

Source context should support:

- Section: CO, CE, PO, PE, DELF.
- Exercise ID.
- Exercise title.
- Source snippet.
- Book/source if available.

## Vocab Migration To MongoDB

Migrating vocabulary from SQL to MongoDB is recommended because vocabulary data is flexible and likely to grow with contextual metadata.

Reasons:

- Flexible schema for words, phrases, notes, examples, source snippets, AI explanations later.
- Easier to add per-user metadata.
- Better fit for nested review and source context fields.
- Easier evolution without frequent relational migrations.

Suggested collection: `vocab_cards`

```ts
{
  _id: ObjectId,
  user_id: string,
  language: "fr",
  text: string,
  type: "word" | "phrase",
  translation?: string,
  notes: string[],
  examples: Array<{
    text: string,
    translation?: string,
    source?: string
  }>,
  tags: string[],
  level?: "A2" | "B1" | "B2",
  source?: {
    section: "CO" | "CE" | "PO" | "PE" | "DELF",
    exercise_id?: string,
    exercise_title?: string,
    source_type?: "numbers" | "video_podcast" | "delf_book" | "manual",
    snippet?: string
  },
  srs: {
    status: "new" | "learning" | "due" | "mastered",
    due_at?: Date,
    interval_days: number,
    ease_factor: number,
    last_grade?: number,
    review_count: number
  },
  created_at: Date,
  updated_at: Date
}
```

Suggested collection: `vocab_reviews`

```ts
{
  _id: ObjectId,
  user_id: string,
  vocab_id: ObjectId,
  grade: number,
  reviewed_at: Date,
  next_due_at?: Date
}
```

Migration strategy:

1. Create Mongo repository for vocab.
2. Add compatibility service that can read old SQL cards and new Mongo cards during transition.
3. Backfill existing SQL vocab into Mongo.
4. Switch write path to Mongo.
5. Validate review scheduling.
6. Remove or legacy-isolate old SQL vocab APIs after migration is stable.

## CO: Comprehension Orale

CO contains listening-focused practice.

Subsections:

1. Comprendre les nombres.
2. Videos & Podcasts.
3. DELF Ecoute.

### CO A: Comprendre les nombres

This is the current numbers dictation feature.

User flow:

1. Open CO.
2. Choose Comprendre les nombres.
3. Select category.
4. Start exercise.
5. Listen to prompt.
6. Type answer.
7. Submit.
8. See instant correction.
9. Continue to next prompt.
10. See summary.

Categories can include:

- Dates.
- Prices.
- Phone numbers.
- Times.
- Addresses.
- Statistics.
- Banking.
- Medical.
- Weather.
- Transport.
- Quantities.

Tracking:

- Session status.
- Accuracy.
- Mistake types.
- Category performance.
- Completed items.

### CO B: Videos & Podcasts

This uses current CO/CE media practice content, focused on listening.

User flow:

1. Choose level A2/B1/B2.
2. Browse video or podcast exercises.
3. Open exercise.
4. Watch or listen.
5. Optionally open transcript.
6. Answer CO questions.
7. Submit.
8. Review correction.
9. Save vocabulary from transcript/questions.

UI requirements:

- Media player should be prominent.
- Questions should be easy to scan.
- Transcript should be collapsible.
- Mobile layout should put media first, questions second.

### CO C: DELF Ecoute

This contains DELF listening exercises from books.

User flow:

1. Choose level.
2. Choose book/source.
3. Choose listening exercise.
4. Play audio.
5. Answer questions.
6. Submit.
7. Review result.

Product distinction:

- Videos & Podcasts is general comprehension practice.
- DELF Ecoute is exam-format listening practice from DELF books.

## CE: Comprehension Ecrite

CE contains reading-focused practice.

Subsections:

1. DELF Lire.
2. Videos & Podcasts Exercise.

### CE A: DELF Lire

This is current DELF CE reading practice.

User flow:

1. Choose level.
2. Choose book.
3. Choose reading exercise.
4. Read document.
5. Answer questions.
6. Submit.
7. Review correction.
8. Save vocabulary from document.

UI requirements:

- Reading text must be comfortable.
- Paragraph breaks must be clean.
- Source line should be placed at the end, right aligned and italic.
- Instructions should remain visible.
- Questions should have clear answer states.

### CE B: Videos & Podcasts Exercise

This uses transcript/article/media-based content for reading comprehension.

User flow:

1. Choose level/topic.
2. Read source content or transcript-derived material.
3. Answer CE questions.
4. Submit.
5. Review.
6. Save vocabulary.

## PO: Production Orale

PO keeps the current pratique orale concept.

Subsection:

- Pratique orale.

User flow:

1. Choose level or topic.
2. Open a prompt.
3. User thinks and answers orally.
4. User clicks to reveal a proposed answer.
5. User compares their answer with the proposal.
6. User saves useful phrases or vocabulary.
7. User moves to the next prompt.

Product framing:

This is a reflection and model-answer practice archive, not yet a voice AI coach.

Future improvements:

- Voice recording.
- Self-assessment.
- AI feedback.
- Pronunciation feedback.

## PE: Production Ecrite

PE will be developed later.

Initial state:

- Placeholder page.
- Clear explanation that PE is coming.
- Optional feedback CTA.

Future PE scope:

- Writing prompts by DELF level.
- User-written answer.
- Model answer.
- Correction rubric.
- Useful phrases.
- Vocabulary save.

## Personal Exercise Progress

Exercise progress is the core personalization layer.

Track progress per user and exercise.

Suggested model: `user_exercise_progress`

```ts
{
  user_id: string,
  exercise_id: string,
  section: "CO" | "CE" | "PO" | "PE",
  source_type: "numbers" | "video_podcast" | "delf_book" | "oral_prompt",
  level?: "A2" | "B1" | "B2",
  status: "not_started" | "in_progress" | "completed",
  score?: number,
  accuracy?: number,
  started_at?: Date,
  completed_at?: Date,
  last_opened_at: Date,
  attempts_count: number,
  saved_vocab_count: number,
  answers_snapshot?: unknown
}
```

This powers:

- Continue learning.
- In-progress badges.
- Completed badges.
- Exercise history.
- Explore status filters.
- Profil progress.
- Personalized Accueil.

## Community

Community remains a simple feedback and product-roadmap area.

Core features:

- View feedback.
- Submit feedback.
- Post incognito.
- Edit own feedback.
- Delete own feedback.
- Status: planned, in progress, done.

Do not turn Community into a social network yet.

Future additions:

- Upvote.
- Comment.
- Category.
- Public roadmap view.

## Profil

Profil is the user's account and personal progress page.

Core sections:

- Account information.
- Current level.
- Exercise history.
- Progress by section.
- Vocab stats.
- Settings.
- Logout.

Avoid heavy analytics.

Useful metrics:

- Exercises completed.
- Exercises in progress.
- Vocab saved.
- Vocab reviewed.
- Current streak, optional.
- Accuracy by section, optional.

## Authentication And Google Scopes

Keep:

- Google OAuth 2.0 login.
- Basic profile/email scope.

Remove:

- Google Drive requirement.
- Drive scopes from login.

Reason:

Transcript and Drive-backed audio lesson flows are being deactivated, so Drive permissions are no longer justified.

## Sunset Plan

Backend-first decision:

- Transcript, Sessions, Analytics, Sync, and Drive-related flows are legacy scope.
- Start by auditing and isolating backend dependencies before removing UI entry points.
- Keep legacy code temporarily only when needed to avoid breaking existing data or imports.
- Do not build new revamp features on top of these legacy flows.
- Sunset these flows completely when the revamp reaches the final cleanup phase.

### Transcript

- Remove from navigation.
- Disable or redirect route.
- Hide upload/transcription UI.
- Keep backend code temporarily if needed, but mark as legacy.
- Delete backend routes, controllers, jobs, and storage dependencies at final sunset.

### Drive

- Remove Drive scope from Google auth.
- Remove Drive requirement from login.
- Keep old Drive code isolated only if needed for legacy data.
- Delete Drive-backed product flows at final sunset.

### Sessions

- Remove study timer from product UX.
- Stop using sessions as the main analytics foundation.
- Replace with exercise progress tracking.
- Delete session-timer APIs at final sunset if no longer needed by progress.

### Analytics

- Remove standalone analytics page.
- Keep lightweight progress in Accueil and Profil.
- Keep backend calculations only if they support personal progress.
- Delete analytics-only APIs at final sunset.

### Sync

- Remove route or redirect.
- Keep no visible product surface.
- Delete sync APIs and jobs at final sunset.

## Backend Architecture Constraints

Apply these constraints during implementation:

- Keep API route/view files thin.
- Put request/response handling in API/view modules.
- Put business orchestration in controllers.
- Put database queries in db_helpers.
- Put legacy APIs in `legacy.py` in the same module.
- Keep code clean and readable.
- Do not add too many comments except for important business logic.
- Watch for N+1 query problems.
- Use bulk queries, joins, eager loading, aggregation, or batched lookups where appropriate.
- Add pagination or bounded limits for list APIs.
- Add or document indexes for user-scoped progress, vocab due dates, status filters, and exercise catalog queries.

## Suggested Backend Modules

Possible target structure:

```txt
backend/src/api/web/
  co.py
  ce.py
  po.py
  pe.py
  explore.py
  vocab.py
  progress.py
  community.py

backend/src/domain/
  controllers/
    exercise_controller.py
    vocab_controller.py
    progress_controller.py
  db_helpers/
    exercise_db_helpers.py
    vocab_db_helpers.py
    progress_db_helpers.py
```

Legacy example:

```txt
backend/src/api/web/transcripts/legacy.py
backend/src/api/web/sessions/legacy.py
```

Actual structure can adapt to the existing repo, but the separation rule should remain.

## Unified Exercise Catalog

Explore will need a unified exercise catalog layer.

It should aggregate:

- Numbers exercises.
- CO/CE video/podcast exercises.
- DELF book exercises.
- PO prompts.
- Future PE prompts.

Catalog item shape:

```ts
{
  id: string,
  title: string,
  section: "CO" | "CE" | "PO" | "PE",
  source_type: "numbers" | "video_podcast" | "delf_book" | "oral_prompt",
  level?: "A2" | "B1" | "B2",
  description?: string,
  tags: string[],
  estimated_minutes?: number,
  status_for_user?: "not_started" | "in_progress" | "completed",
  score_for_user?: number,
  route: string
}
```

Performance note:

Explore must avoid N+1 progress lookups. Fetch catalog items and user progress in bulk, then merge in memory.

## UI Direction

The UI should be fully revamped.

Principles:

- Archive-first.
- Calm and focused.
- Clean sidebar.
- Clear section map.
- Exercise cards over marketing cards.
- Mobile-first practice flows.
- No unnecessary dashboard noise.
- No nested cards.
- Avoid decorative gradients/orbs.
- Clear status badges.
- Strong reading layout for CE/DELF.

Design language:

- Professional learning workspace.
- Quiet, high-clarity visual system.
- Module colors used sparingly.
- Typography optimized for reading.
- Exercise-first screens.

## Key UI Components

Core components to design/build:

- App shell.
- Sidebar navigation.
- Mobile bottom navigation.
- Accueil section map.
- Explore filters.
- Exercise card.
- Exercise status badge.
- Exercise player shell.
- Media player panel.
- Reading document panel.
- Question panel.
- Answer option.
- Correction state.
- Vocab save button.
- Vocab card.
- Vocab review card.
- Progress badge.
- Empty state.
- Locked guest state.
- Coming soon state for PE.

## MVP Release Scope

Must have:

- Google login without Drive scope.
- New app shell and sidebar.
- Accueil.
- Explore.
- Vocabulaire.
- Vocab revision.
- CO:
  - Comprendre les nombres.
  - Videos & Podcasts.
  - DELF Ecoute.
- CE:
  - DELF Lire.
  - Videos & Podcasts.
- PO:
  - Pratique orale.
- PE placeholder.
- Community.
- Profil.
- Personal exercise progress.
- Guest content limitation.

Can wait:

- PE full implementation.
- Voice recording.
- AI oral feedback.
- AI assistant surface.
- Advanced analytics.
- Upvotes/comments in Community.
- Admin redesign.

## Implementation Phases

### Phase 1: Product Cleanup

- Freeze final feature scope.
- Confirm navigation and route map.
- Hide Transcript.
- Hide Sessions.
- Hide Analytics.
- Hide Sync.
- Remove Drive scope from Google login.
- Identify reusable existing components.

Deliverable:

- Clean IA.
- Old surfaces hidden.
- Login simplified.

### Phase 2: Data Foundation

- Design user exercise progress model.
- Design MongoDB vocab model.
- Add progress APIs.
- Add Mongo vocab repository.
- Plan SQL-to-Mongo vocab migration.
- Add unified catalog API for Explore.

Deliverable:

- Personal progress and vocab foundations ready.

### Phase 3: New Shell

- Build new sidebar.
- Build mobile navigation.
- Build Accueil.
- Build Explore shell.
- Build profile shell.

Deliverable:

- New product frame.

### Phase 4: Practice Sections

- Build CO page and subsections.
- Build CE page and subsections.
- Build PO page.
- Build PE placeholder.
- Wire existing exercise players into the new structure.

Deliverable:

- Core practice archive navigable.

### Phase 5: Vocabulaire

- Build new vocabulary list.
- Build revision mode.
- Add save-vocab from exercises.
- Complete Mongo migration.

Deliverable:

- Personal vocab loop complete.

### Phase 6: Progress Personalization

- Track exercise opened/started/completed.
- Show progress on exercise cards.
- Show continue learning on Accueil.
- Show progress in Profil.

Deliverable:

- App feels personal to logged-in users.

### Phase 7: Community And Polish

- Revamp Community UI.
- Add final locked/empty/loading/error states.
- Mobile QA.
- Accessibility pass.
- Performance pass.

Deliverable:

- MVP revamp ready.

## Success Metrics

Activation:

- Percentage of logged-in users who start an exercise.
- Percentage of users who save first vocabulary item.
- Percentage of users who complete first exercise.

Engagement:

- Exercises opened per week.
- Exercises completed per week.
- Vocabulary saved per week.
- Vocabulary reviews completed.

Retention:

- D1 return.
- D7 return.
- Users with in-progress exercises resumed.

Learning:

- Accuracy by section.
- Progress from in-progress to completed.
- Vocab review retention.

## Open Product Questions

- Should CO/CE videos and podcasts be one shared content source with different question modes, or separate exercise entries?
- Should DELF remain source/book-first internally while navigation is skill-first?
- Should PE launch as placeholder only, or include a first manual prompt library?
- Should guest mode allow only A2, or a few samples across all sections?
- Should saved vocab support phrases as first-class items from day one?
- Should exercise progress store answer snapshots for review, or only status/score?

## Recommended First Build Order

1. Remove/sunset non-core surfaces from UI.
2. Simplify Google login scopes.
3. Build new shell and sidebar.
4. Build Accueil.
5. Build Explore with static/unified catalog mapping.
6. Add user exercise progress.
7. Move Vocabulaire to MongoDB.
8. Rewire CO/CE/PO sections.
9. Add PE placeholder.
10. Polish Community and Profil.

## Ticket Breakdown

This backlog breaks the revamp into small, startable tickets. Each ticket should be small enough to implement, review, and test independently.

Priority labels:

- P0: Required before the new MVP can be used.
- P1: Required for a complete MVP experience.
- P2: Polish, hardening, or follow-up improvements.

### Execution Notes

#### REV-001 Audit Result

Status: Completed.

Current frontend routes:

- `/`: public landing page. Keep temporarily; later route logged-in users to Accueil.
- `/onboarding`: onboarding flow. Move or simplify after new Accueil exists.
- `/auth/google/callback`: Google OAuth callback. Keep.
- `/learning`: current dashboard. Move to `/accueil`.
- `/learning/review-hub`: current vocabulary review hub. Move to `/vocabulaire/revision`.
- `/learning/vocab`: current vocabulary list. Move to `/vocabulaire`.
- `/learning/workspace`: current training hub. Split into Explore and section pages.
- `/learning/workspace?open=editor`: dictation/transcript workspace. Legacy; sunset with Transcript.
- `/learning/numbers-dictation`: current numbers dictation. Keep; move to `/co/nombres`.
- `/learning/coce-practice`: current CO/CE media practice. Keep content; split into CO Videos & Podcasts and CE Videos & Podcasts.
- `/learning/delf-practice`: current DELF practice entry. Keep content; split into `/co/delf-ecoute` and `/ce/delf-lire`.
- `/learning/delf-practice/[level]/[[...slug]]`: current DELF detail route. Keep content; re-route under CO/CE skill routes.
- `/learning/speaking-practice`: current oral practice. Keep; move to `/po/pratique-orale`.
- `/learning/community`: current community feedback. Keep; move to `/communaute`.
- `/learning/sync`: legacy visible route. Hide after backend legacy isolation.
- `/learning/transcribe`: legacy visible route. Hide after backend legacy isolation.

Current frontend navigation:

- `web/src/components/learning/layout/learning-nav.tsx` exposes Dashboard, Review Hub, Vocabulary, Training, Numbers, Transcribe, and Sync.
- `web/src/app/learning/page.tsx` exposes dashboard cards and dock actions for Vocabulaire, Entrainement, Transcrire, and Session.
- `web/src/app/learning/layout.tsx` globally mounts `LearningSessionTimer`, `AiAssistantLauncher`, and `SyncSaveModal`.
- `web/src/app/learning/workspace/page.tsx` exposes Dictée, Dictée de nombres, CO/CE Practice, Pratique orale, and DELF Practice.
- `web/src/components/ui/navigation.tsx` also contains route-specific global navigation behavior for `/learning/workspace` and `/learning/transcribe`.

Current backend route groups:

- `/api/auth/*`: keep, but remove Drive/offline assumptions during REV-106.
- `/api/web/vocab*`: keep for now; later migrate write path to Mongo.
- `/api/web/numbers/*`: keep for CO numbers, but Drive fallback streaming should be treated as legacy.
- `/api/web/coce/*`: keep content source for CO/CE Videos & Podcasts.
- `/api/web/delf/*`: keep content source for DELF Ecoute and DELF Lire.
- `/api/web/speaking-practice/topics`, `/content`, `/audio`: keep for PO practice.
- `/api/web/speaking-practice/sets`: Drive-backed admin/create endpoint. Legacy unless still needed for admin tooling.
- `/api/web/community*`: keep.
- `/api/web/ai*`: defer; non-core first revamp scope.
- `/api/web/sessions*`: legacy study timer/session tracking. Replace with exercise progress.
- `/api/web/transcripts*`: legacy transcript CRUD. Sunset.
- `/api/web/analytics`: legacy standalone analytics because it is session-based. Replace with lightweight progress summaries.
- `/api/web/audio-lessons*`: Drive-backed transcript/audio lesson flow. Legacy.
- `/api/web/numbers/admin/*`: Drive-backed admin dataset generation/staging. Legacy or admin-only, not revamp user scope.

Current backend legacy modules:

- `backend/src/api/web/sessions.py`
- `backend/src/api/web/transcripts.py`
- `backend/src/api/web/analytics.py`
- `backend/src/api/web/audio_lessons.py`
- `backend/src/domain/controllers.py` session, transcript, and analytics controller sections.
- `backend/src/domain/db_queries.py` `SessionQueries` and `TranscriptQueries`.
- `backend/src/domain/services/analytics.py`.
- `backend/src/shared/drive_services.py`.
- `backend/src/infra/drive/*`.
- `backend/src/shared/numbers/repository/google_drive_repo.py`.
- `backend/src/shared/numbers/admin/*` Drive-backed generation/staging helpers.

Current database legacy tables/models:

- `LearningSessionORM` / `learning_sessions`: legacy study timer/session analytics.
- `LearningTranscriptORM` / `learning_transcripts`: legacy transcript flow, includes `lesson_audio_folder_id`.
- `LearningAudioLessonORM` / `learning_audio_lessons`: Drive-backed audio lesson storage.
- `UserORM.extra.google_auth`: currently stores Google access/refresh token and scope for Drive-backed flows.

Current Drive-related auth findings:

- `web/src/components/auth/login-button.tsx` requests `openid email profile https://www.googleapis.com/auth/drive.file`.
- `backend/src/api/auth/__init__.py` exchanges the auth code, stores Google OAuth tokens, and currently rejects login when no refresh token is available.
- `backend/src/shared/drive_services.py` refreshes stored Google access tokens for Drive-backed flows.
- Removing Drive scope also requires relaxing the backend refresh-token requirement if revamp login should only require profile/email.

Route classification:

- Keep and move: numbers dictation, CO/CE practice, DELF practice, speaking practice, vocabulary, community.
- Replace: dashboard, workspace hub, review hub, session analytics.
- Legacy and sunset: transcribe, transcript CRUD, sync page, study sessions/timer, standalone analytics, Drive-backed audio lessons, Drive-backed admin staging where not needed by revamp content publishing.

#### REV-003 Audit Result

Status: Completed.

Legacy backend dependency inventory:

- Sessions:
  - Route module: `backend/src/api/web/sessions.py`.
  - Registered routes: `GET/POST /api/web/sessions`, `GET /api/web/sessions/<session_id>`.
  - Domain layer: `create_session_controller`, `list_sessions_controller`, `get_session_controller`.
  - DB helper: `SessionQueries`.
  - ORM/table: `LearningSessionORM` / `learning_sessions`.
  - Frontend callers: `learningApi.createSession`, `createTimeSession`, `getSessions`, `getSessionById`, `deleteSession`.
  - Frontend surfaces: dashboard session CTA, global session timer, recent sessions, workspace session components.
  - Classification: isolate temporarily; replace with `user_exercise_progress`.

- Transcripts:
  - Route module: `backend/src/api/web/transcripts.py`.
  - Registered routes: `GET/POST /api/web/transcripts`, `GET/PUT/DELETE /api/web/transcripts/<transcript_id>`.
  - Domain layer: `create_transcript_controller`, `list_transcripts_controller`, `get_transcript_controller`, `update_transcript_controller`, `delete_transcript_controller`.
  - DB helper: `TranscriptQueries`.
  - ORM/table: `LearningTranscriptORM` / `learning_transcripts`.
  - Frontend callers: `learningApi.createTranscript`, `getTranscript`, `updateTranscript`, `deleteTranscript`.
  - Frontend surfaces: `/learning/transcribe`, `/learning/workspace?open=editor`, transcript drafts, numbers save-transcript action.
  - Classification: isolate temporarily; fully delete when transcript/dictation editor is sunset.

- Analytics:
  - Route module: `backend/src/api/web/analytics.py`.
  - Registered route: `GET /api/web/analytics`.
  - Domain layer: `get_analytics_summary_controller`.
  - Service: `AnalyticsService`.
  - Data dependency: `SessionQueries` and SQL vocabulary stats.
  - Frontend caller: `learningApi.getAnalytics`.
  - Frontend surfaces: `/learning` dashboard chart, streak, daily minutes.
  - Classification: isolate temporarily; replace with lightweight progress/vocab summaries.

- Sync:
  - No dedicated backend route found.
  - Frontend route: `/learning/sync`.
  - Frontend components: `SyncSaveModal`, guest sync/upgrade prompts, secondary nav Sync item.
  - Backend coupling: indirect through Google auth/Drive-backed save flows.
  - Classification: hide from UI after backend legacy isolation; delete final route/components when guest login flow is rebuilt.

- Drive-backed audio lessons:
  - Route module: `backend/src/api/web/audio_lessons.py`.
  - Registered routes: `/api/web/audio-lessons`, `/api/web/audio-lessons/tts`, `/api/web/audio-lessons/conversation`, `/api/web/audio-lessons/<lesson_id>/transcript`, `/api/web/audio-lessons/<lesson_id>/audio`, `/api/web/audio-lessons/<lesson_id>/questions`.
  - Service: `backend/src/shared/drive_services.py`.
  - Infra: `backend/src/infra/drive/client.py`, `backend/src/infra/drive/repository.py`.
  - ORM/table: `LearningAudioLessonORM` / `learning_audio_lessons`.
  - Frontend callers: `learningApi.getAudioLessons`, `getAudioLessonDetail`, `getAudioLessonAudioBlob`, `saveAudioLesson`.
  - Frontend surfaces: transcribe save-to-Drive, session workspace audio lesson selector/player.
  - Classification: isolate temporarily; sunset with Transcript/audio lesson flow.

- Drive-backed speaking practice creation:
  - Route: `POST /api/web/speaking-practice/sets`.
  - Route module: `backend/src/api/web/speaking_practice.py`.
  - Service: `get_drive_services_for_user`.
  - Retrieval routes are GitHub-backed and should be kept for PO.
  - Classification: isolate create/admin path only; keep GitHub-backed retrieval for revamp PO.

- Drive-backed numbers admin/staging:
  - Route module: `backend/src/api/web/numbers_admin.py`.
  - Helpers: `backend/src/shared/numbers/admin/*`, `backend/src/shared/numbers/repository/google_drive_repo.py`.
  - User route `GET /api/web/numbers/audio/<audio_ref>` has a legacy Drive fallback when `audio_ref` is not URL/path-backed.
  - GitHub-backed numbers practice is revamp scope and should be kept.
  - Classification: isolate Drive-backed admin/staging and fallback streaming; keep user numbers practice.

- Google OAuth / Drive coupling:
  - Frontend scope: `web/src/components/auth/login-button.tsx` requests `https://www.googleapis.com/auth/drive.file`.
  - Backend auth: `backend/src/api/auth/__init__.py` stores Google access/refresh tokens and currently rejects login without a refresh token.
  - OAuth helper: `backend/src/infra/auth/google_oauth.py` persists token scope and refresh token.
  - Refresh path: `backend/src/shared/drive_services.py` refreshes stored tokens for Drive-backed flows.
  - Classification: remove Drive scope and relax refresh-token requirement for normal login; isolate refresh logic for legacy Drive endpoints until final deletion.

Keep because revamp needs it:

- `/api/web/vocab*` until Mongo migration replaces or wraps SQL vocabulary.
- `/api/web/numbers/sessions*`, `/next`, `/answer`, `/summary`, except Drive fallback audio behavior.
- `/api/web/coce/*` user exercise/transcript/question endpoints.
- `/api/web/delf/*` user test/audio/asset endpoints.
- `/api/web/speaking-practice/topics`, `/topics/<topic_id>`, `/content`, `/audio`.
- `/api/web/community*`.

Remove now candidates:

- No backend route should be deleted before `REV-004` because route registration is centralized in `backend/src/api/web/__init__.py` and frontend still imports legacy client methods.
- UI-only Sync can be hidden once legacy backend isolation is in place.

Isolate temporarily:

- Sessions, Transcripts, Analytics, Audio Lessons, Drive-backed speaking create, Drive-backed numbers admin/staging, Drive fallback audio streaming, Google token refresh services.

Risks:

- Removing Drive scope before changing backend auth will break login because `create_token` currently requires a refresh token.
- Removing session APIs before new progress APIs will break dashboard, session timer, workspace recent sessions, and analytics.
- Removing transcript APIs before hiding transcribe/workspace editor will break save-to-transcript flows.
- Removing Drive services before replacing audio lesson/session workspace paths will break transcribe save-to-Drive and audio lesson playback.
- Removing all Drive infra too early may affect admin content generation paths even though they are not revamp user scope.

#### REV-005 Final Legacy Sunset Checklist

Status: Completed.

Execute this checklist only after the new Accueil, Explore, Vocabulaire, Progress, CO, CE, PO, PE placeholder, Community, and Profil flows are stable.

Backend deletion checklist:

- Delete or archive `backend/src/api/web/sessions.py`.
- Delete or archive `backend/src/api/web/transcripts.py`.
- Delete or archive `backend/src/api/web/analytics.py` if progress summaries have replaced it.
- Delete or archive `backend/src/api/web/audio_lessons.py`.
- Remove legacy route registrations for `/sessions`, `/transcripts`, `/analytics`, and `/audio-lessons`.
- Delete session/transcript/analytics controllers from `backend/src/domain/controllers.py`.
- Delete `SessionQueries` and `TranscriptQueries` from `backend/src/domain/db_queries.py`.
- Delete `AnalyticsService` if no progress summary uses it.
- Delete `LearningSessionORM`, `LearningTranscriptORM`, and `LearningAudioLessonORM` only after migration/data-retention decision is complete.
- Delete or isolate `backend/src/shared/drive_services.py` when no legacy Drive endpoint remains.
- Delete `backend/src/infra/drive/*` when no Drive admin/content tooling remains.
- Remove Drive-backed numbers admin/staging helpers if GitHub-backed content publishing fully replaces them.
- Remove Drive-backed speaking create route if GitHub-backed/admin publishing fully replaces it.

Frontend deletion checklist:

- Delete `/learning/transcribe`.
- Delete `/learning/sync`.
- Delete `/learning/workspace?open=editor` dictation/transcript editor path.
- Delete global `LearningSessionTimer`.
- Delete dashboard/session timer CTA and recent session widgets.
- Delete transcript draft IndexedDB utilities if no longer referenced.
- Delete `learningApi` methods for sessions, transcripts, audio lessons, and standalone analytics.
- Delete transcribe components and Drive storage transparency components.
- Delete session workspace components that only support timer/transcript/audio lesson flows.

Auth and config checklist:

- Remove Drive OAuth scope from frontend login.
- Make backend login work without Google refresh token.
- Stop storing Google access/refresh token for normal login unless a remaining legacy/admin Drive endpoint explicitly needs it.
- Remove Drive-specific login copy and error copy.
- Remove obsolete Drive env vars/docs after final backend deletion.

Verification checklist:

- App starts with no imports from deleted legacy modules.
- Login succeeds with only `openid email profile`.
- No visible route or navigation link reaches Transcript, Sync, Sessions timer, standalone Analytics, or Drive-backed audio lessons.
- Accueil and Profil progress summaries use `user_exercise_progress`, not `learning_sessions`.
- Explore status uses bulk progress lookup, not session analytics.
- Tests or smoke checks cover login, Accueil, Explore, Vocabulaire, CO numbers, CE DELF Lire, PO practice, Community, and Profil.

#### REV-004 Implementation Note

Status: Completed initial backend isolation.

Changes made:

- Added `backend/src/api/web/legacy.py`.
- Moved legacy route registration for Sessions, Transcripts, Analytics, Numbers admin Drive-backed routes, Audio Lessons, and Drive-backed Speaking Practice create into `register_legacy_web_routes`.
- Updated `backend/src/api/web/__init__.py` so active web routes are registered directly and legacy routes are registered through the isolated helper.
- Kept all legacy URL paths available for now to avoid breaking existing frontend calls during the revamp.

Verification:

- `python3 -m compileall backend/src/api/web` passes.
- Full Flask app factory import could not complete in this local environment because optional runtime dependencies such as `azure.cognitiveservices.speech` and `youtube_transcript_api` are not installed; the failures occur while importing pre-existing practice modules.

Follow-up:

- `REV-106` can now remove the Drive scope and relax the backend refresh-token requirement.
- Frontend cleanup tickets can hide Transcript, Sessions, Analytics, and Sync without losing the backend isolation boundary.

#### REV-106 Implementation Note

Status: Backend-only complete.

Changes made:

- Updated `backend/src/api/auth/__init__.py` so normal Google login no longer fails when Google does not return a refresh token.
- Google login now updates only Google identity metadata and does not persist Google OAuth access/refresh tokens.
- Drive OAuth token storage is no longer part of the active login path.

#### REV-106B Implementation Note

Status: Completed backend Drive flow shutdown.

Decision:

- Drive-backed app flows are no longer active and are not needed for the revamp backend.

Changes made:

- Removed Google OAuth token persistence from normal login entirely; `/api/auth/token` now stores only Google identity metadata.
- Disabled all registered Drive-backed legacy routes with `410 Gone`, including audio lesson reads, numbers admin reads/mutations, and speaking practice Drive creation.
- Removed Drive-backed route imports from `backend/src/api/web/legacy.py` so the legacy registry no longer imports Drive services.
- Removed the legacy Drive audio fallback from `GET /api/web/numbers/audio/<audio_ref>`; Git-backed audio paths still redirect to `NUMBERS_AUDIO_BASE_URL`.
- Removed backend generation of `/api/web/numbers/audio/<drive_id>` fallback URLs when public audio base URL is unavailable.
- Removed `X-Google-Access-Token` from backend CORS allowed headers.
- Removed Drive-specific API error handlers from the active API error registry.
- Removed the stale `backend/src/api/web/audio_lessons.py` route module.
- Removed Google OAuth refresh-token helpers and `google_auth` persistence helpers from the active auth/query layer.
- Removed import-time Azure TTS initialization from GitHub-backed speaking practice retrieval.

Temporary code retention:

- Some unregistered Drive storage helper modules still exist in the codebase for final deletion, but no active app route should require Google Drive OAuth tokens.

Verification:

- `python3 -m compileall backend/src/api/auth backend/src/api/web` passes.

Deferred frontend work:

- Remove `https://www.googleapis.com/auth/drive.file` from `web/src/components/auth/login-button.tsx` later.
- Update guest/login copy that currently mentions Google Drive sync later.
- Do not change frontend during the current backend-first pass.

#### REV-002 Scope Decision

Status: Completed with implementation defaults.

Decisions:

- CO/CE videos and podcasts should use one shared content source internally, with separate CO and CE exercise entries or modes in the catalog.
- DELF should remain source/book-first internally, while navigation and user-facing discovery are skill-first.
- PE launches as placeholder only in the MVP.
- Guest mode should expose a small sample set across the main sections instead of only A2.
- Saved vocab supports words and phrases as first-class items from day one.
- Exercise progress should support optional answer snapshots, but MVP UI should not depend on snapshots until review flows need them.

#### REV-101 Implementation Note

Status: Completed as no-op.

Findings:

- No user-facing `Arcueil` label was found in `web` or `backend`.
- Existing visible label is already `Accueil`.

#### REV-201 To REV-204 Implementation Note

Status: Completed backend foundation.

Changes made:

- Added SQLAlchemy model `UserExerciseProgressORM` in `backend/src/infra/db/orm.py`.
- Added Alembic migration `backend/alembic/versions/3c7e9a1f2b4d_add_user_exercise_progress.py`.
- Added `ExerciseProgressQueries` in `backend/src/domain/db_queries.py`.
- Added progress controllers in `backend/src/domain/controllers.py`.
- Added `ExerciseProgressUpdateRequest` in `backend/src/api/schemas.py`.
- Added authenticated web API endpoints in `backend/src/api/web/progress.py`.
- Registered active routes:
  - `GET /api/web/progress`
  - `POST /api/web/progress`
  - `GET /api/web/progress/summary`
  - `GET /api/web/progress/<exercise_id>`

Data model:

- Unique progress row per `(user_id, exercise_id)`.
- Tracks section, source type, level, status, score, accuracy, timestamps, attempts, saved vocab count, optional answer snapshot, and extra metadata.
- Adds indexes for user/status, user/section, and catalog-style filtering.

Verification:

- `python3 -m compileall backend/src backend/alembic/versions/3c7e9a1f2b4d_add_user_exercise_progress.py` passes.
- In-memory SQLAlchemy smoke test passed for create/start/complete/get/list/summary progress flow.
- Full Flask route-map smoke test is still blocked in this local environment by missing optional runtime dependencies (`azure`, `youtube_transcript_api`, `pymongo`), but progress modules compile and controller behavior is verified.

#### REV-210 To REV-211 Implementation Note

Status: Completed backend foundation.

Changes made:

- Added unified catalog service in `backend/src/domain/services/exercise_catalog.py`.
- Added catalog controller in `backend/src/domain/controllers.py`.
- Added authenticated web API endpoint in `backend/src/api/web/catalog.py`.
- Registered active route:
  - `GET /api/web/catalog/exercises`
- Catalog service is provider-based. Adding a future exercise family should mean adding a new provider, then registering it in `ExerciseCatalogService`.

Catalog sources:

- Numbers blueprints as CO `numbers` items.
- SQL `coce_exercises` as CO/CE `video_podcast` items.
- Active SQL `delf_test_papers` as `delf_book` items.
- Speaking-practice topics as PO `oral_prompt` items.

Progress behavior:

- Uses one bulk progress query for all returned `exercise_id` values before status filtering.
- Returns `status_for_user`, score, accuracy, last opened, and completion metadata per item.
- Supports bounded filters for section, level, source type, status, limit, and offset.
- Catalog listing does not fetch GitHub exercise content. High-latency GitHub manifest/content reads stay behind detail endpoints after a user opens a specific exercise/topic.

Verification:

- `python3 -m compileall backend/src` passes.
- In-memory SQLAlchemy smoke test passed for CO/CE catalog progress merge, completed-status filtering, and DELF level filtering.

#### REV-205 To REV-206 Implementation Note

Status: Completed backend foundation.

Changes made:

- Extended Mongo helper in `backend/src/infra/mongo.py` with vocabulary collections:
  - `vocab_cards`
  - `vocab_reviews`
- Added idempotent vocabulary index creation helper `ensure_vocabulary_indexes`.
- Added Mongo vocabulary repository in `backend/src/domain/vocabulary_mongo.py`.

Mongo card shape:

- `user_id`, `text`, `text_normalized`, `item_type`, `language`, `native_language`.
- `translation`, `notes`, `examples`, `tags`, `level`.
- `source_context` with section, exercise id, exercise title, source type, snippet, book, and page.
- SRS state: status, next due date, last reviewed date, interval, ease, reps, lapses, streak, last grade.
- Soft-delete fields and flexible `extra` metadata.

Indexes:

- Due queue: user, language, status, next due date.
- User text lookup: user, language, normalized text.
- User tags.
- User source exercise.
- User updated date.
- Text search across text, translation, notes, and example text.
- Review history by user/card/reviewed date.

Repository behavior:

- User-scoped create, get, update, soft delete, hard delete, list, due list, and review-history insert.
- List queries are bounded and support search/filter inputs needed by Vocabulaire.
- Existing SQL `/api/web/vocab` route is intentionally unchanged. Switching writes/reads to Mongo remains a later compatibility/backfill step (`REV-208` to `REV-209`, then `REV-505`).

#### REV-207 Implementation Note

Status: Completed backend foundation.

Changes made:

- Added `MongoSRSService` in `backend/src/domain/services/srs.py`.
- Reused the existing `FSRSModel` and `FSRSState` so SQL and Mongo review scheduling stay behaviorally aligned.
- Added a raw-card accessor in `MongoVocabularyRepository` for backend services.
- Updated Mongo review serialization so nested previous/next SRS states are JSON-safe.

Mongo review behavior:

- Reads current card SRS state from `vocab_cards`.
- Calculates next state in application memory with the shared FSRS model.
- Updates current card state in `vocab_cards`.
- Inserts append-only review history into `vocab_reviews`.
- Batch review skips missing cards, matching the existing SQL batch behavior.

Current scope:

- Existing SQL `/api/web/vocab:review-batch` route is intentionally unchanged.
- Mongo SRS will be wired through the compatibility/switch layer in later tickets.

#### REV-208 Implementation Note

Status: Completed backend foundation.

Changes made:

- Added `VocabularyCompatibilityService` in `backend/src/domain/vocabulary_compat.py`.
- Exported the service from `backend/src/domain/__init__.py`.

Compatibility behavior:

- New vocabulary writes go to Mongo through `MongoVocabularyRepository`.
- Reads can resolve prefixed ids:
  - `mongo:<id>`
  - `sql:<id>`
- Unprefixed ids try Mongo first, then SQL legacy fallback.
- List and due-list responses merge Mongo cards with SQL legacy cards into a unified card shape.
- SQL cards are mapped into Mongo-compatible fields where possible:
  - `word` becomes `text`.
  - `due_at` becomes `next_due_at`.
  - `extra.source_context`, `extra.examples`, and `extra.level` are preserved when present.

Current scope:

- Existing `/api/web/vocab` routes remain SQL-backed until the switch ticket.
- This service is the bridge for `REV-209` backfill and the later Mongo write-path switch.

#### REV-209 Implementation Note

Status: Completed backend foundation.

Changes made:

- Added `backend/scripts/backfill_vocab_sql_to_mongo.py`.
- Added sparse unique Mongo index for `(user_id, legacy_sql_id)`.

Backfill behavior:

- Default mode is dry-run. Mongo is only imported/used when running with `--apply`.
- Optional filters:
  - `--user-id`
  - `--language`
  - `--limit`
  - `--skip-indexes`
- Inserts raw Mongo documents instead of using `create_card`, so existing SQL timestamps and SRS state are preserved.
- Copies SQL `VocabularyCardORM` fields into Mongo `vocab_cards`:
  - `word` to `text`.
  - `due_at` to `next_due_at`.
  - SRS fields: status, last reviewed, interval, ease, reps, lapses, streak, last grade.
  - `extra.source_context`, `extra.examples`, `extra.level`, and `extra.native_language` where present.
- Idempotency:
  - Stores top-level `legacy_sql_id`.
  - Stores `extra.imported_from_sql_id`.
  - Skips rows already imported for the same user.
- Logs scanned, migrated, skipped, and failed counts.

Run examples:

```bash
cd backend
uv run python scripts/backfill_vocab_sql_to_mongo.py
uv run python scripts/backfill_vocab_sql_to_mongo.py --apply
```

#### REV-505 Backend Switch Preparation Note

Status: Superseded by Mongo primary implementation.

Changes made:

- Added `VOCAB_STORAGE_BACKEND` config.
- Initial default remained `sql` during compatibility validation.
- When `VOCAB_STORAGE_BACKEND=compat`, existing `/api/web/vocab` endpoints route through `VocabularyCompatibilityService`.

Compat-routed endpoints:

- `GET /api/web/vocab`
- `POST /api/web/vocab`
- `GET /api/web/vocab/<card_id>`
- `PATCH /api/web/vocab/<card_id>`
- `DELETE /api/web/vocab/<card_id>`
- `DELETE /api/web/vocab/<card_id>/hard`
- `GET /api/web/vocab/due`
- `POST /api/web/vocab:review-batch`
- `GET /api/web/vocab/stats`

Safety:

- No frontend changes.
- SQL remains the default path unless explicitly enabled by env.
- Compat path supports `mongo:<id>` and `sql:<id>` ids while preserving legacy unprefixed SQL fallback behavior where possible.
- New writes go to Mongo only when `VOCAB_STORAGE_BACKEND=compat`.

Legacy decision:

- SQL vocabulary is now legacy storage.
- Mongo `vocab_cards` and `vocab_reviews` are the target revamp storage.
- Keep SQL read fallback only during the transition window.
- Do not add new features to SQL vocabulary paths.
- Remove SQL vocabulary read/write paths only after enough production confidence that:
  - Backfill has completed and repeated `--apply` runs only skip already imported rows.
  - New cards are consistently created in Mongo.
  - Review flow updates Mongo SRS state and appends Mongo review history.
  - Due list and stats remain correct with Mongo data.
  - No active client still depends on unprefixed SQL-only card ids.

#### REV-505 Mongo Primary Implementation Note

Status: Completed backend switch.

Changes made:

- `/api/web/vocab` now uses Mongo vocabulary storage directly.
- Removed active route dependency on SQL vocabulary controllers and SQL `VocabularyQueries`.
- `VOCAB_STORAGE_BACKEND` default is now `mongo`.
- Existing SQL vocabulary tables/models remain in the codebase only as legacy data/schema until final cleanup.

Mongo-routed endpoints:

- `GET /api/web/vocab`
- `POST /api/web/vocab`
- `GET /api/web/vocab/<card_id>`
- `PATCH /api/web/vocab/<card_id>`
- `DELETE /api/web/vocab/<card_id>`
- `DELETE /api/web/vocab/<card_id>/hard`
- `GET /api/web/vocab/due`
- `POST /api/web/vocab:review-batch`
- `GET /api/web/vocab/stats`

Compatibility:

- API responses keep `word`, `due_at`, and `id` fields for frontend compatibility.
- Mongo ids are returned as `mongo:<id>`.
- Incoming ids may include `mongo:<id>` or the raw Mongo id.

Legacy decision:

- SQL vocabulary read/write paths are no longer active in revamp vocab APIs.
- Do not delete SQL vocabulary table/model yet.
- Remove SQL vocabulary schema, SQL query helpers, and migration bridge during final legacy cleanup after one stable production window.

### Phase 0: Discovery And Guardrails

#### REV-001: Audit Current Routes And Navigation

Priority: P0

Goal:

- Identify every currently visible route, sidebar item, mobile nav item, backend route, and legacy entry point.

Scope:

- List current routes.
- List backend API routes and services that support visible routes.
- Mark each route as keep, move, hide, redirect, or legacy.
- Confirm where Transcript, Sessions, Analytics, Sync, and Drive-related flows appear.

Acceptance criteria:

- A route inventory exists in the revamp plan or a linked implementation note.
- Every legacy surface has a target action: hide, redirect, or keep as internal legacy.
- Transcript, Sessions, Analytics, Sync, and Drive-related flows are explicitly marked as legacy.
- No code changes are required in this ticket unless a simple route list already exists.

Dependencies:

- None.

#### REV-002: Confirm MVP Feature Scope

Priority: P0

Goal:

- Freeze the first revamp scope so implementation does not expand mid-stream.

Scope:

- Confirm keep/sunset lists.
- Confirm route map.
- Confirm PE is placeholder only.
- Confirm guest-mode limitation policy.

Acceptance criteria:

- The revamp plan has a final MVP scope section marked as accepted.
- Open product questions that block implementation are answered or deferred.

Dependencies:

- REV-001.

#### REV-003: Audit Legacy Backend Dependencies

Priority: P0

Goal:

- Understand backend dependencies for Transcript, Sessions, Analytics, Sync, and Drive before removing product surfaces.

Scope:

- Identify route handlers, controllers, db helpers, jobs, models, environment variables, external APIs, storage buckets, and scheduled tasks used by legacy flows.
- Mark which dependencies are still required by non-legacy features.
- Identify Drive scope usage in auth and downstream services.

Acceptance criteria:

- A backend legacy dependency inventory exists.
- Each dependency is marked as remove now, isolate temporarily, or keep because it supports revamp scope.
- Risks are documented for anything that cannot be removed immediately.

Dependencies:

- REV-001.

#### REV-004: Isolate Legacy Backend APIs

Priority: P0

Goal:

- Move legacy backend surfaces away from new revamp API paths.

Scope:

- Mark Transcript, Sessions, Analytics-only, Sync, and Drive-backed APIs as legacy.
- Move or wrap legacy route files according to the repo's existing structure.
- Avoid new imports from revamp controllers into legacy modules.
- Keep behavior stable while isolating.

Acceptance criteria:

- New revamp APIs do not depend on legacy modules.
- Legacy APIs are easy to find and delete later.
- Existing imports/tests are updated if module paths change.

Dependencies:

- REV-003.

#### REV-005: Add Final Legacy Sunset Checklist

Priority: P0

Goal:

- Make full removal explicit so legacy code does not survive indefinitely.

Scope:

- Create a checklist for deleting Transcript, Sessions, Analytics-only, Sync, and Drive-backed code.
- Include backend routes, frontend routes, jobs, env vars, docs, tests, and stale database dependencies.
- Define the condition for executing final deletion.

Acceptance criteria:

- The plan clearly states these flows will be fully removed at the end of the revamp.
- Each legacy area has a final deletion checklist.
- Temporary legacy retention has an owner or condition.

Dependencies:

- REV-003.

### Phase 1: Product Cleanup

#### REV-101: Rename Accueil Navigation Label

Priority: P0

Goal:

- Replace any user-facing "Arcueil" label with "Accueil".

Scope:

- Sidebar.
- Mobile nav.
- Breadcrumbs.
- Page title.
- Any route metadata or menu config.

Acceptance criteria:

- The app no longer shows "Arcueil" in the UI.
- Existing route behavior remains unchanged unless a route rename is explicitly required.

Dependencies:

- REV-001.

#### REV-102: Hide Transcript Surface From Navigation

Priority: P0

Goal:

- Remove Transcript from the main product journey.

Scope:

- Remove Transcript from sidebar and mobile navigation.
- Remove homepage/dashboard cards that lead to Transcript.
- Keep backend code untouched unless required to avoid broken imports.

Acceptance criteria:

- Logged-in users cannot reach Transcript from primary navigation.
- Direct legacy route either still loads as legacy or redirects cleanly.
- No broken navigation links remain.

Dependencies:

- REV-004.

#### REV-103: Hide Sessions And Study Timer Surface

Priority: P0

Goal:

- Remove study session timer as a visible product feature.

Scope:

- Hide Sessions route from navigation.
- Hide timer widgets, session CTAs, and dashboard blocks.
- Keep any backend session code only as legacy support.

Acceptance criteria:

- No visible product entry point promotes study timer sessions.
- Existing pages do not show broken or empty timer containers.

Dependencies:

- REV-004.

#### REV-104: Hide Standalone Analytics Page

Priority: P0

Goal:

- Remove analytics as a standalone product surface.

Scope:

- Remove Analytics from navigation.
- Remove dashboard links to standalone analytics.
- Keep lightweight progress data available for Accueil and Profil later.

Acceptance criteria:

- Users cannot access Analytics from primary app navigation.
- Direct route is either redirected or treated as legacy.

Dependencies:

- REV-004.

#### REV-105: Hide Sync Surface

Priority: P0

Goal:

- Remove Sync from the visible revamp product.

Scope:

- Remove Sync from navigation.
- Remove visible sync CTA/cards.
- Keep internal code only if still required by legacy data.

Acceptance criteria:

- No visible Sync page or CTA appears in the logged-in journey.
- Direct route behavior is documented.

Dependencies:

- REV-004.

#### REV-106: Remove Google Drive Scope From Login

Priority: P0

Goal:

- Simplify Google OAuth to basic profile/email access only.

Scope:

- Remove Drive scopes from OAuth configuration.
- Remove login copy that says Drive access is required.
- Verify login still creates or loads the user account.

Acceptance criteria:

- OAuth request no longer asks for Google Drive permission.
- Login succeeds with basic profile/email scope.
- Any Drive-dependent legacy flow is not reachable from primary navigation.

Dependencies:

- REV-003.

### Phase 2: Data Foundation

#### REV-201: Add User Exercise Progress Data Model

Priority: P0

Goal:

- Create persistent per-user exercise progress.

Scope:

- Add model/table/collection for `user_exercise_progress`.
- Include user, exercise, section, source type, level, status, score, timestamps, attempts, saved vocab count, and optional answer snapshot.
- Add indexes for user/exercise lookup and user/status filtering.

Acceptance criteria:

- Progress records can be created, updated, and queried by user.
- Duplicate progress rows for the same user and exercise are prevented.
- Migration or schema creation is documented.

Dependencies:

- REV-002.

#### REV-202: Add Progress Repository Or DB Helper

Priority: P0

Goal:

- Keep progress database access out of route handlers.

Scope:

- Add db helper functions for get, bulk get, upsert, and list recent progress.
- Add bounded list queries.
- Avoid N+1 progress lookups.

Acceptance criteria:

- API/controller code can read and write progress through helper functions.
- Bulk progress lookup supports Explore catalog merging.
- Unit tests or focused integration tests cover core helper behavior where feasible.

Dependencies:

- REV-201.

#### REV-203: Add Progress Controller

Priority: P0

Goal:

- Centralize progress business logic.

Scope:

- Add methods for opened, started, completed, retried, and summary states.
- Normalize status transitions.
- Handle score, accuracy, attempts, and last opened timestamp.

Acceptance criteria:

- Routes do not implement progress transition rules directly.
- Completing an exercise updates status, score, attempts, and completed timestamp.
- Opening an exercise updates last opened timestamp.

Dependencies:

- REV-202.

#### REV-204: Add Progress API Endpoints

Priority: P0

Goal:

- Expose progress operations to the frontend.

Scope:

- Add endpoints for current user's progress summary.
- Add endpoint to update exercise progress.
- Add endpoint to fetch recent or in-progress exercises.

Acceptance criteria:

- Endpoints require authentication.
- Users can only access their own progress.
- List endpoints are paginated or bounded.

Dependencies:

- REV-203.

#### REV-205: Design Mongo Vocabulary Collections

Priority: P0

Goal:

- Finalize MongoDB shape for vocabulary and reviews.

Scope:

- Confirm `vocab_cards` fields.
- Confirm `vocab_reviews` fields.
- Define indexes for user, due date, status, tags, and source exercise.

Acceptance criteria:

- Collection schema is documented.
- Indexes are documented or implemented.
- Required fields and default SRS values are clear.

Dependencies:

- REV-002.

#### REV-206: Add Mongo Vocabulary Repository

Priority: P0

Goal:

- Add Mongo-backed read/write operations for vocabulary cards.

Scope:

- Create card.
- Update card.
- Delete card.
- Get by ID.
- List by user with search/filter/pagination.
- List due cards.

Acceptance criteria:

- Repository methods are user-scoped.
- List methods have bounded limits.
- Due vocabulary query can power revision mode.

Dependencies:

- REV-205.

#### REV-207: Add Vocabulary Review Scheduling

Priority: P1

Goal:

- Support basic SRS review updates.

Scope:

- Record review grade.
- Update review count, last grade, status, interval, ease factor, and next due date.
- Insert review history into `vocab_reviews`.

Acceptance criteria:

- Reviewing a card creates a review history entry.
- Card due date changes after review.
- Failed/low grades keep or return card to learning/due.

Dependencies:

- REV-206.

#### REV-208: Add SQL-To-Mongo Vocabulary Compatibility Service

Priority: P1

Goal:

- Allow transition from old SQL vocabulary to Mongo vocabulary.

Scope:

- Read old SQL cards and new Mongo cards during migration.
- Prefer Mongo writes for new cards once enabled.
- Keep transformation rules explicit.

Acceptance criteria:

- Existing users can still see old vocabulary during transition.
- New vocabulary can be written to Mongo.
- Source fields are mapped as accurately as current data allows.

Dependencies:

- REV-206.

#### REV-209: Add SQL-To-Mongo Vocabulary Backfill Script

Priority: P1

Goal:

- Migrate existing SQL vocabulary cards into Mongo.

Scope:

- Batch backfill by user.
- Avoid duplicate imported cards.
- Log counts for migrated, skipped, and failed records.

Acceptance criteria:

- Script can be run safely more than once.
- Imported cards have user, text, source, timestamps, and SRS defaults.
- Migration result is verifiable by count checks.

Dependencies:

- REV-208.

#### REV-210: Add Unified Exercise Catalog Service

Priority: P0

Goal:

- Provide a single catalog shape for Explore and Accueil.

Scope:

- Aggregate numbers exercises.
- Aggregate CO/CE videos and podcasts.
- Aggregate DELF book exercises.
- Aggregate PO prompts.
- Include PE placeholder if useful for navigation.

Acceptance criteria:

- Catalog returns normalized item fields from the plan.
- Catalog can filter by skill, level, source, and status.
- User progress is merged in bulk, not per item.

Dependencies:

- REV-202.

#### REV-211: Add Explore Catalog API

Priority: P0

Goal:

- Expose catalog items to the frontend.

Scope:

- Add authenticated catalog endpoint.
- Support filter query params.
- Include status and score for logged-in users.
- Support guest limitation behavior.

Acceptance criteria:

- Explore can fetch catalog cards from one endpoint.
- Status filters work without N+1 progress queries.
- Guest users receive only allowed sample content.

Dependencies:

- REV-210.

### Phase 3: New Shell And Core Pages

#### REV-301: Build New App Shell

Priority: P0

Goal:

- Create the new logged-in product frame.

Scope:

- Layout wrapper.
- Desktop sidebar.
- Main content region.
- Authenticated route handling.
- Remove heavy workspace/dashboard framing.

Acceptance criteria:

- Logged-in pages render inside the new shell.
- Sidebar contains Accueil, Explore, Vocabulaire, Communaute, Profil.
- CO/CE/PO/PE are not top-level sidebar items.

Dependencies:

- REV-101, REV-102, REV-103, REV-104, REV-105.

#### REV-302: Build Mobile Bottom Navigation

Priority: P1

Goal:

- Make primary navigation usable on mobile.

Scope:

- Bottom nav with Accueil, Explore, Vocabulaire, Communaute, Profil.
- Active state.
- Safe-area spacing.

Acceptance criteria:

- Mobile users can switch main sections without horizontal overflow.
- Bottom nav does not cover important page actions.
- Desktop sidebar remains unaffected.

Dependencies:

- REV-301.

#### REV-303: Build Shared Exercise Card Component

Priority: P0

Goal:

- Standardize catalog cards across Accueil and Explore.

Scope:

- Skill/source/level display.
- Title.
- Status badge.
- Score if completed.
- Estimated duration if available.
- CTA label based on status.

Acceptance criteria:

- Card supports Start, Continue, Retry, and Review states.
- Card links to the correct route.
- Layout works on mobile and desktop.

Dependencies:

- REV-211.

#### REV-304: Build Status Badge And Progress Badge Components

Priority: P0

Goal:

- Provide consistent progress states across the app.

Scope:

- Not started.
- In progress.
- Completed.
- Retry suggested.
- Optional score display.

Acceptance criteria:

- Badges are visually distinct without dominating the card.
- Labels are consistent across Accueil, Explore, and Profil.

Dependencies:

- REV-303.

#### REV-305: Build Accueil Page

Priority: P0

Goal:

- Replace dashboard-style home with a personal entry point.

Scope:

- Greeting.
- Level indicator or selector.
- Reprendre section.
- Main section map.
- Vocabulaire a reviser.
- Activite recente.
- Lightweight progress summary.

Acceptance criteria:

- Accueil gives a clear next action.
- In-progress and recent exercises come from progress APIs.
- Due vocabulary count links to revision.
- No heavy analytics dashboard appears.

Dependencies:

- REV-204, REV-211, REV-301, REV-303.

#### REV-306: Build Explore Page Shell

Priority: P0

Goal:

- Create the exercise catalog browsing page.

Scope:

- Filter controls for skill, level, source, and status.
- Catalog grid/list.
- Empty state.
- Loading and error states.

Acceptance criteria:

- Users can browse catalog items.
- Filters update the displayed list.
- Card status reflects current user's progress.

Dependencies:

- REV-211, REV-301, REV-303.

#### REV-307: Build Profil Page Shell

Priority: P1

Goal:

- Create a simple account and personal progress page.

Scope:

- Account info.
- Current level.
- Exercise history.
- Progress by section.
- Vocab stats.
- Settings/logout entry.

Acceptance criteria:

- Page avoids heavy analytics.
- Exercise history is bounded or paginated.
- User can log out from Profil or existing auth surface remains available.

Dependencies:

- REV-204, REV-301.

### Phase 4: Practice Sections

#### REV-401: Build CO Landing Page

Priority: P0

Goal:

- Create CO as a section page with three subsections.

Scope:

- Comprendre les nombres.
- Videos & Podcasts.
- DELF Ecoute.
- Level/status summary where available.

Acceptance criteria:

- `/co` shows the three CO subsections.
- Each subsection links to the correct route.
- Page uses archive-style cards, not marketing sections.

Dependencies:

- REV-301, REV-303.

#### REV-402: Rewire CO Numbers Into New Route

Priority: P0

Goal:

- Keep the existing numbers dictation feature available under the new CO structure.

Scope:

- Route `/co/nombres`.
- Category selection.
- Existing exercise/session flow.
- Progress tracking hooks for opened, started, completed.

Acceptance criteria:

- User can complete a numbers exercise from the new route.
- Accuracy and completion update user progress.
- Existing numbers behavior does not regress.

Dependencies:

- REV-203, REV-401.

#### REV-403: Build CO Videos & Podcasts Catalog And Detail Route

Priority: P1

Goal:

- Expose listening media exercises under CO.

Scope:

- Route `/co/videos-podcasts`.
- Detail route for individual media exercises.
- Media-first layout.
- Collapsible transcript.
- CO questions and correction state.

Acceptance criteria:

- User can browse and open CO media exercises.
- User can submit answers and see correction.
- Progress updates on open/start/complete.

Dependencies:

- REV-203, REV-401.

#### REV-404: Build CO DELF Ecoute Catalog And Detail Route

Priority: P1

Goal:

- Expose DELF listening exercises under CO.

Scope:

- Route `/co/delf-ecoute`.
- Level/book/exercise browsing.
- Audio player.
- Question answering and review.

Acceptance criteria:

- User can browse DELF listening exercises.
- Audio and questions render correctly.
- Completion updates progress.

Dependencies:

- REV-203, REV-401.

#### REV-405: Build CE Landing Page

Priority: P0

Goal:

- Create CE as a section page with reading subsections.

Scope:

- DELF Lire.
- Videos & Podcasts Exercise.
- Level/status summary where available.

Acceptance criteria:

- `/ce` shows CE subsections.
- Each subsection links to the correct route.

Dependencies:

- REV-301, REV-303.

#### REV-406: Rewire DELF Lire Into New CE Route

Priority: P0

Goal:

- Keep current DELF CE reading practice inside the new CE structure.

Scope:

- Route `/ce/delf-lire`.
- Detail route for reading exercises.
- Comfortable reading layout.
- Source line at the end, right aligned and italic.
- Clear answer states.

Acceptance criteria:

- User can complete a DELF reading exercise from the new route.
- Reading text layout is clean and mobile-safe.
- Completion updates progress.

Dependencies:

- REV-203, REV-405.

#### REV-407: Build CE Videos & Podcasts Exercise Route

Priority: P1

Goal:

- Support transcript/article-based reading comprehension.

Scope:

- Route `/ce/videos-podcasts`.
- Browse by level/topic.
- Read source content.
- Answer CE questions.
- Review correction.

Acceptance criteria:

- User can complete a CE media-derived reading exercise.
- Source text and questions are easy to scan.
- Completion updates progress.

Dependencies:

- REV-203, REV-405.

#### REV-408: Rewire PO Pratique Orale

Priority: P1

Goal:

- Keep current oral practice prompts under the new PO route.

Scope:

- Route `/po/pratique-orale`.
- Browse by level or topic.
- Prompt view.
- Reveal proposed answer.
- Save useful phrases or vocabulary where available.

Acceptance criteria:

- User can open oral prompts from the new route.
- Reveal answer flow works.
- Opening and completion/reflection update progress where appropriate.

Dependencies:

- REV-203, REV-301.

#### REV-409: Add PE Placeholder Page

Priority: P0

Goal:

- Add the future PE section without pretending the full module exists.

Scope:

- Route `/pe`.
- Coming soon state.
- Optional feedback CTA.

Acceptance criteria:

- PE appears in Accueil and Explore as future/coming soon where appropriate.
- Page clearly says PE is coming later.
- No broken exercise flow is exposed.

Dependencies:

- REV-301.

#### REV-410: Add Shared Vocab Save Button In Exercise Views

Priority: P1

Goal:

- Let users save useful vocabulary from exercises.

Scope:

- Shared save action.
- Exercise source context passed to vocabulary API.
- Basic success/error states.

Acceptance criteria:

- User can save a word or phrase from supported exercise pages.
- Saved card includes section, exercise ID, title, source type, and snippet when available.
- Saved vocab count can update progress.

Dependencies:

- REV-206, REV-203.

### Phase 5: Vocabulaire

#### REV-501: Build Vocabulaire List Page

Priority: P0

Goal:

- Create the personal saved vocabulary archive.

Scope:

- List saved cards.
- Search.
- Filters for source, tag, level, status, due date.
- Pagination or bounded infinite loading.

Acceptance criteria:

- User can view their saved vocabulary.
- Search and filters work against Mongo-backed API.
- Empty state supports adding the first card.

Dependencies:

- REV-206, REV-301.

#### REV-502: Add Manual Vocabulary Create/Edit/Delete

Priority: P0

Goal:

- Let users manage vocabulary manually.

Scope:

- Add card form.
- Edit card form.
- Delete confirmation.
- Fields for text, type, translation, notes, examples, tags, level.

Acceptance criteria:

- User can add, edit, and delete their own cards.
- Required fields are validated.
- Deleted cards no longer appear in list or review.

Dependencies:

- REV-501.

#### REV-503: Build Vocabulary Card Component

Priority: P1

Goal:

- Standardize vocabulary display.

Scope:

- Text and type.
- Translation.
- Tags.
- Source context.
- SRS status and due date.
- Edit/delete actions.

Acceptance criteria:

- Card works in list and compact contexts.
- Long text does not break mobile layout.
- Source context links back to exercise when possible.

Dependencies:

- REV-501.

#### REV-504: Build Vocabulaire Revision Mode

Priority: P0

Goal:

- Let users review due vocabulary.

Scope:

- Route `/vocabulaire/revision`.
- Due card queue.
- Reveal answer.
- Grade response.
- Empty state when no cards are due.

Acceptance criteria:

- User can review due cards.
- Review grade updates SRS scheduling.
- Completed review session returns a clear summary or done state.

Dependencies:

- REV-207, REV-501.

#### REV-505: Switch Vocabulary Write Path To Mongo

Priority: P1

Goal:

- Make MongoDB the primary storage for new vocabulary.
- Treat SQL vocabulary as legacy transition storage.

Scope:

- Ensure all new vocab save actions write to Mongo.
- Keep compatibility read path only as needed.
- Verify exercise save flow uses Mongo.
- Stop adding new SQL vocabulary behavior.
- After confidence window, remove SQL vocabulary write path and then SQL read fallback.

Acceptance criteria:

- New manual and exercise-saved vocabulary cards are created in Mongo.
- Old SQL write path is no longer used by revamp UI.
- Existing old cards remain visible during transition.
- SQL vocabulary code has a documented deletion point once backfill and compat validation are complete.
- Active `/api/web/vocab` routes no longer call SQL vocabulary controllers.

Dependencies:

- REV-208, REV-410, REV-502.

### Phase 6: Progress Personalization

#### REV-601: Track Exercise Opened

Priority: P0

Goal:

- Capture last opened exercise for resume flows.

Scope:

- Call progress API when a user opens supported exercise detail pages.
- Set status to in progress only when appropriate.
- Update last opened timestamp.

Acceptance criteria:

- Recently opened exercises appear in Accueil.
- Opening an exercise does not mark it completed.
- Reopening a completed exercise preserves completed status unless retried.

Dependencies:

- REV-204, practice detail routes.

#### REV-602: Track Exercise Started And Completed

Priority: P0

Goal:

- Capture meaningful progress outcomes.

Scope:

- Mark started when user begins answering or starts a session.
- Mark completed on submit/finish.
- Save score/accuracy when available.
- Increment attempts count.

Acceptance criteria:

- Completed exercises show completed status in Explore.
- Scores appear on completed exercise cards when available.
- Retry attempts are counted correctly.

Dependencies:

- REV-203, practice detail routes.

#### REV-603: Add Continue Learning To Accueil

Priority: P0

Goal:

- Help users resume unfinished work.

Scope:

- Use recent in-progress progress records.
- Show last opened exercise.
- Link directly to continuation route.

Acceptance criteria:

- Accueil displays unfinished exercises when they exist.
- Empty state suggests Explore.
- Continue CTA opens the correct exercise route.

Dependencies:

- REV-305, REV-601, REV-602.

#### REV-604: Add Progress Status To Explore Filters

Priority: P0

Goal:

- Let users browse by personal progress state.

Scope:

- Status filter values: not started, in progress, completed, retry suggested.
- API query support.
- UI filter support.

Acceptance criteria:

- Explore status filter returns correct user-specific results.
- Filtering remains performant with bulk progress merge.

Dependencies:

- REV-306, REV-602.

#### REV-605: Add Progress Summary To Profil

Priority: P1

Goal:

- Show personal practice history without creating heavy analytics.

Scope:

- Exercises completed.
- Exercises in progress.
- Progress by section.
- Vocab saved/reviewed.
- Recent history.

Acceptance criteria:

- Profil shows accurate summary counts.
- History list is bounded or paginated.
- UI remains simple and account-focused.

Dependencies:

- REV-307, REV-602, REV-504.

### Phase 7: Community, Guest Mode, And Polish

#### REV-701: Revamp Community Page UI

Priority: P1

Goal:

- Keep Community as feedback and roadmap, not a social network.

Scope:

- View feedback.
- Submit feedback.
- Incognito option.
- Edit/delete own feedback.
- Status display: planned, in progress, done.

Acceptance criteria:

- Existing community functionality still works.
- UI matches the new app shell.
- No upvote/comment scope is added.

Dependencies:

- REV-301.

#### REV-702: Add Guest Content Limitation

Priority: P0

Goal:

- Keep guest mode available but limited.

Scope:

- Define allowed guest exercises.
- Lock or hide non-guest content.
- Add locked guest state with login CTA.

Acceptance criteria:

- Guest users can access only allowed content.
- Locked states do not break catalog layout.
- Login CTA returns users to a sensible destination after auth where feasible.

Dependencies:

- REV-211, REV-306.

#### REV-703: Add Shared Empty, Loading, Error, And Locked States

Priority: P1

Goal:

- Make core pages resilient and consistent.

Scope:

- Empty state.
- Loading state.
- Error state.
- Locked guest state.
- Coming soon state.

Acceptance criteria:

- Accueil, Explore, Vocabulaire, practice sections, Community, and Profil use consistent states.
- States include useful next actions.
- Mobile layout is not broken by long messages.

Dependencies:

- Core pages complete.

#### REV-704: Mobile QA Pass

Priority: P1

Goal:

- Verify the revamp works on mobile.

Scope:

- Accueil.
- Explore.
- Vocabulaire and revision.
- CO/CE exercise detail pages.
- PO prompt page.
- Profil.

Acceptance criteria:

- No horizontal scrolling.
- Primary actions remain reachable.
- Media-first CO layout works on mobile.
- CE reading text remains comfortable.

Dependencies:

- Core pages complete.

#### REV-705: Accessibility Pass

Priority: P1

Goal:

- Improve keyboard, semantic, and contrast quality before MVP.

Scope:

- Navigation landmarks.
- Button/link semantics.
- Form labels.
- Focus states.
- Color contrast.
- Keyboard access for filters, cards, revision grading, and exercise submit.

Acceptance criteria:

- Primary flows are keyboard usable.
- Form controls have accessible labels.
- Status is conveyed with text, not color alone.

Dependencies:

- Core pages complete.

#### REV-706: Performance Pass

Priority: P1

Goal:

- Prevent slow catalog/progress/vocab screens.

Scope:

- Explore catalog query.
- Progress merge.
- Vocabulary list and due query.
- Accueil resume/recent queries.
- Index verification.

Acceptance criteria:

- List APIs are bounded or paginated.
- No obvious N+1 progress lookups.
- Required indexes are implemented or documented.

Dependencies:

- REV-211, REV-501, REV-603.

#### REV-707: Delete Sunset Legacy Flows

Priority: P1

Goal:

- Fully remove Transcript, Sessions, Analytics-only, Sync, and Drive-backed flows after revamp replacement paths are stable.

Scope:

- Delete legacy backend routes, controllers, db helpers, jobs, and service wrappers that no longer support revamp scope.
- Delete legacy frontend routes, navigation guards, pages, and stale client API calls.
- Remove unused Drive scopes, env vars, docs, tests, and dead dependencies.
- Keep only lightweight progress calculations that directly support Accueil, Explore, Vocabulaire, or Profil.

Acceptance criteria:

- No Transcript, study timer Sessions, standalone Analytics, Sync, or Drive-backed product flow remains reachable.
- OAuth still requests only basic profile/email scopes.
- Test suite and app startup pass without legacy imports.
- Legacy sunset checklist from REV-005 is completed or explicitly marked not applicable item by item.

Dependencies:

- REV-005, REV-106, REV-601, REV-602, REV-603, REV-605, REV-706.

#### REV-707A Implementation Note

Status: Completed backend write shutdown.

Changes made:

- Added a shared `410 Gone` response for disabled legacy write routes in `backend/src/api/web/legacy.py`.
- Disabled legacy session creation: `POST /api/web/sessions`.
- Disabled legacy transcript mutations: `POST /api/web/transcripts`, `PUT /api/web/transcripts/<transcript_id>`, and `DELETE /api/web/transcripts/<transcript_id>`.
- Disabled Drive-backed audio lesson writes: `POST /api/web/audio-lessons`, `POST /api/web/audio-lessons/tts`, `POST /api/web/audio-lessons/conversation`, and `POST /api/web/audio-lessons/<lesson_id>/questions`.
- Disabled Drive-backed numbers admin mutations: `POST /api/web/numbers/admin/datasets`, `POST /api/web/numbers/admin/manifests:cleanup`, and `POST /api/web/numbers/admin/manifests:guest-preview`.
- Disabled Drive-backed speaking practice creation: `POST /api/web/speaking-practice/sets`.

Temporary retention:

- Legacy read routes remain registered for now where they may still be needed during cleanup: `GET /sessions`, `GET /sessions/<session_id>`, `GET /transcripts`, `GET /transcripts/<transcript_id>`, `GET /analytics`, `GET /audio-lessons`, audio lesson read/stream endpoints, and `GET /numbers/admin/datasets`.
- GitHub-backed revamp/admin content publishing routes are unchanged.

Next deletion point:

- After frontend calls and production traffic confirm no dependency on these disabled writes, delete the route modules, controllers, SQL helpers, Drive helpers, and stale client calls listed in `REV-005`.

### Suggested First Sprint

Start backend-first so legacy dependencies are understood before UI routes are hidden:

1. REV-001: Audit Current Routes And Navigation.
2. REV-003: Audit Legacy Backend Dependencies.
3. REV-005: Add Final Legacy Sunset Checklist.
4. REV-004: Isolate Legacy Backend APIs.
5. REV-106: Remove Google Drive Scope From Login.
6. REV-002: Confirm MVP Feature Scope.
7. REV-101: Rename Accueil Navigation Label.
8. REV-102: Hide Transcript Surface From Navigation.
9. REV-103: Hide Sessions And Study Timer Surface.
10. REV-104: Hide Standalone Analytics Page.
11. REV-105: Hide Sync Surface.
12. REV-301: Build New App Shell.

### Suggested Parallel Tracks

Frontend track:

- REV-301, REV-302, REV-303, REV-304, REV-305, REV-306.

Backend track:

- REV-003, REV-004, REV-005, REV-106, REV-201, REV-202, REV-203, REV-204, REV-210, REV-211, REV-707.

Vocabulary track:

- REV-205, REV-206, REV-207, REV-208, REV-209, REV-501, REV-504.

Practice track:

- REV-401, REV-402, REV-405, REV-406, REV-408, REV-409.

Polish track:

- REV-701, REV-702, REV-703, REV-704, REV-705, REV-706, REV-707.
