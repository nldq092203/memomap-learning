import { apiClient } from "@/lib/services/api-client"
import type { ApiResponse } from "@/lib/types/api"

export type ExerciseProgressSection = "CO" | "CE" | "PO" | "PE"
export type ExerciseProgressSourceType =
  | "numbers"
  | "video_podcast"
  | "delf_book"
  | "oral_prompt"
  | "writing_prompt"
export type ExerciseProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "retry_suggested"
export type ExerciseProgressEvent =
  | "opened"
  | "started"
  | "completed"
  | "retried"
  | "updated"

export interface ExerciseProgressRecord {
  id: string
  user_id: string
  exercise_id: string
  section: ExerciseProgressSection
  source_type: ExerciseProgressSourceType
  level?: string | null
  status: ExerciseProgressStatus
  score?: number | null
  accuracy?: number | null
  started_at?: string | null
  completed_at?: string | null
  last_opened_at?: string | null
  attempts_count: number
  saved_vocab_count: number
  answers_snapshot?: unknown
  created_at?: string | null
  updated_at?: string | null
  extra?: Record<string, unknown>
}

export interface ExerciseProgressPayload {
  exercise_id: string
  section: ExerciseProgressSection
  source_type: ExerciseProgressSourceType
  level?: string | null
  status?: ExerciseProgressStatus
  score?: number | null
  accuracy?: number | null
  saved_vocab_count?: number | null
  answers_snapshot?: unknown
  extra?: Record<string, unknown> | null
}

export interface ExerciseProgressListResponse {
  items: ExerciseProgressRecord[]
  total: number
  limit: number
  offset: number
}

export interface ExerciseProgressSummaryResponse {
  by_status: Partial<Record<ExerciseProgressStatus, number>>
  by_section: Partial<Record<ExerciseProgressSection, Partial<Record<ExerciseProgressStatus, number>>>>
}

const BASE = "web/progress"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("auth_token")
  } catch {
    return null
  }
}

function absoluteApiUrl(endpoint: string): string {
  const base = apiClient.getBaseUrl().replace(/\/+$/, "")
  const path = endpoint.replace(/^\/+/, "")
  return `${base}/${path}`
}

async function progressFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  const response = await fetch(absoluteApiUrl(endpoint), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  })
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || body?.status === "error") {
    throw new Error(body?.message || body?.error || "Progress request failed")
  }

  return body?.data as T
}

async function updateProgress(
  event: ExerciseProgressEvent,
  payload: ExerciseProgressPayload,
): Promise<ExerciseProgressRecord> {
  return progressFetch<ExerciseProgressRecord>(BASE, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      event,
    }),
  })
}

export const learningProgressApi = {
  markOpened(payload: ExerciseProgressPayload) {
    return updateProgress("opened", payload)
  },

  markStarted(payload: ExerciseProgressPayload) {
    return updateProgress("started", payload)
  },

  markCompleted(payload: ExerciseProgressPayload) {
    return updateProgress("completed", payload)
  },

  markRetried(payload: ExerciseProgressPayload) {
    return updateProgress("retried", payload)
  },

  listProgress(params?: {
    status?: ExerciseProgressStatus
    section?: ExerciseProgressSection
    limit?: number
    offset?: number
  }) {
    const search = new URLSearchParams()
    if (params?.status) search.set("status", params.status)
    if (params?.section) search.set("section", params.section)
    if (params?.limit) search.set("limit", String(params.limit))
    if (params?.offset) search.set("offset", String(params.offset))
    const suffix = search.toString()
    return progressFetch<ExerciseProgressListResponse>(
      suffix ? `${BASE}?${suffix}` : BASE,
    )
  },

  getSummary() {
    return progressFetch<ExerciseProgressSummaryResponse>(`${BASE}/summary`)
  },
}

