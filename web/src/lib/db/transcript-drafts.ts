import Dexie, { Table } from "dexie"

export interface TranscriptDraft {
  id: string
  language: string
  title: string
  sourceUrl: string | null
  transcript: string
  notes: string[]
  comments: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
   status: "draft" | "saved"
  expiresAt: number
}

// Default TTL for local drafts (in milliseconds).
// Drafts older than this will be automatically cleaned up on access.
export const TRANSCRIPT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const TRANSCRIPT_SAVED_TTL_MS = 1 * 24 * 60 * 60 * 1000 // 1 day after cloud save

class TranscriptDraftDB extends Dexie {
  drafts!: Table<TranscriptDraft, string>

  constructor() {
    super("TranscriptDraftDB")
    this.version(1).stores({
      // Primary key: id
      // Secondary indexes: language, updatedAt, expiresAt for cleanup
      drafts: "id, language, updatedAt, expiresAt",
    })
  }
}

export const transcriptDraftDb = new TranscriptDraftDB()

export async function cleanupExpiredDrafts(): Promise<void> {
  const now = Date.now()
  try {
    await transcriptDraftDb.drafts.where("expiresAt").below(now).delete()
  } catch (error) {
    // Best effort only; offline drafts are non-critical.
    console.warn("Failed to cleanup expired transcript drafts", error)
  }
}

export async function loadTranscriptDraft(id: string): Promise<TranscriptDraft | null> {
  await cleanupExpiredDrafts()
  try {
    const draft = await transcriptDraftDb.drafts.get(id)
    if (!draft) return null
    // If a draft somehow persisted past TTL, treat it as expired.
    if (draft.expiresAt <= Date.now()) {
      await transcriptDraftDb.drafts.delete(id)
      return null
    }
    return draft
  } catch (error) {
    console.warn("Failed to load transcript draft", error)
    return null
  }
}

export interface TranscriptDraftUpsert {
  id: string
  language: string
  title: string
  sourceUrl?: string | null
  transcript: string
  notes?: string[]
  comments?: string[]
  tags?: string[]
  status?: TranscriptDraft["status"]
}

export async function saveTranscriptDraft(input: TranscriptDraftUpsert): Promise<TranscriptDraft> {
  const nowIso = new Date().toISOString()
  const nowMs = Date.now()

  const existing = await transcriptDraftDb.drafts.get(input.id)

   const status: TranscriptDraft["status"] =
     input.status ?? existing?.status ?? "draft"
   const ttl =
     status === "saved" ? TRANSCRIPT_SAVED_TTL_MS : TRANSCRIPT_DRAFT_TTL_MS

  const draft: TranscriptDraft = {
    id: input.id,
    language: input.language,
    title: input.title,
    sourceUrl: input.sourceUrl ?? existing?.sourceUrl ?? null,
    transcript: input.transcript,
    notes: input.notes ?? existing?.notes ?? [],
    comments: input.comments ?? existing?.comments ?? [],
    tags: input.tags ?? existing?.tags ?? [],
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    status,
    expiresAt: nowMs + ttl,
  }

  await transcriptDraftDb.drafts.put(draft)
  return draft
}

export async function deleteTranscriptDraft(id: string): Promise<void> {
  try {
    await transcriptDraftDb.drafts.delete(id)
  } catch (error) {
    console.warn("Failed to delete transcript draft", error)
  }
}

export async function listTranscriptDrafts(language: string): Promise<TranscriptDraft[]> {
  await cleanupExpiredDrafts()
  try {
    const drafts = await transcriptDraftDb.drafts
      .where("language")
      .equals(language)
      .and(d => d.status === "draft")
      .sortBy("updatedAt")

    return drafts.reverse()
  } catch (error) {
    console.warn("Failed to list transcript drafts", error)
    return []
  }
}

