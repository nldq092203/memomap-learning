// CO/CE Practice API Types

// Media types supported
export type ExerciseMediaType = 'audio' | 'video'

// CEFR levels supported (extended range)
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

// Backward compatibility alias
export type CoCeLevel = CEFRLevel

// Unified exercise model (includes all data)
export interface CoCeExercise {
  id: string
  name: string
  level: CEFRLevel
  duration_seconds: number
  media_type: ExerciseMediaType
  media_id: string
  created_at: string
  updated_at?: string
  
  // Dynamically generated URLs
  video_url?: string // YouTube embed URL (if media_type === 'video')
  audio_url?: string // Direct MP3 URL (if media_type === 'audio')
  
  // GitHub Content URLs (available in detail view)
  co_github_url?: string
  ce_github_url?: string
  transcript_github_url?: string
}

// Transcript structure
export interface CoCeTranscript {
  id: string
  name: string
  level?: string
  language: string // e.g., 'fr'
  duration_seconds: number
  transcript: string // The full text
  audio_filename?: string
}

// Question types
export type QuestionType = 'single_choice' | 'multiple_choice'

// Individual question
export interface CoCeQuestion {
  id: string
  type: QuestionType
  question: string
  options: string[] // List of possible answers
  correct_indices: number[] // Indices of correct options (0-based)
  explanation?: string // Explanation for the correct answer
}

// QCM metadata
export interface QcmMeta {
  type: 'compréhension_orale' | 'compréhension_écrite'
  niveau: CEFRLevel
  titre: string
  consigne?: string
  total_questions?: number
}

// Questions response (QCM file structure)
export interface CoCeQuestions {
  meta: QcmMeta
  questions: CoCeQuestion[]
}

// API responses
export interface CoCeExerciseListResponse {
  items: CoCeExercise[]
  level: CEFRLevel
}
