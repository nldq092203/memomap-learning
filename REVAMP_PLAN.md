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

### Transcript

- Remove from navigation.
- Disable or redirect route.
- Hide upload/transcription UI.
- Keep backend code temporarily if needed, but mark as legacy.

### Drive

- Remove Drive scope from Google auth.
- Remove Drive requirement from login.
- Keep old Drive code isolated only if needed for legacy data.

### Sessions

- Remove study timer from product UX.
- Stop using sessions as the main analytics foundation.
- Replace with exercise progress tracking.

### Analytics

- Remove standalone analytics page.
- Keep lightweight progress in Accueil and Profil.
- Keep backend calculations only if they support personal progress.

### Sync

- Remove route or redirect.
- Keep no visible product surface.

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

