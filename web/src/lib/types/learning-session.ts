export type LearningSessionStatus = "draft" | "active" | "unsaved" | "saved"

export interface LearningSession {
  id: string
  sessionId?: string
  language: string
  title: string
  duration: number
  status: LearningSessionStatus
  startedAt: string
  stoppedAt?: string
  createdAt: string
  updatedAt: string
  /**
   * New single-session model (Entry removed)
   */
  sourceUrl?: string | null
  transcript?: string
  notes?: string[]
  comments?: string[]
  tags?: string[]
  // New fields for session management
  lastAccessedAt: string // For cleanup tracking
  isBackedUp: boolean // Whether data has been successfully saved to backend
  backendId?: string // ID from backend after successful save
}

export interface LocalVocabCard {
  id: string
  sessionId: string
  entryId?: string
  word: string
  translation: string | null
  notes: string[]
  tags: string[]
  language: string
  createdAt: string
  updatedAt: string
}

export interface SessionSummary {
  id: string
  title: string
  language: string
  duration: number
  status: LearningSessionStatus
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
  isBackedUp: boolean
  backendId?: string
}

