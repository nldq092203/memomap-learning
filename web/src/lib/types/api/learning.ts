// Shared learning types for API responses

export interface LearningSession {
  id: string
  language: string
  name: string
  duration_seconds: number
  tags?: string[]
  extra?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface SessionListResponse {
  items: LearningSession[]
  total: number
  limit: number
  offset: number
  next_page_token?: string
}

export interface Transcript {
  id: string
  language: string
  source_url?: string | null
  transcript?: string | null
  notes?: string[] | null
  tags?: string[]
  lesson_audio_folder_id?: string | null
  extra?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TranscriptListResponse {
  items: Transcript[]
  total: number
  limit: number
  offset: number
}

