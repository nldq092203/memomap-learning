// CO/CE Practice API Types

// CEFR levels supported
export type CoCeLevel = "B1" | "B2" | "C1" | "C2"

// Exercise metadata from manifest
export interface CoCeExercise {
  id: string
  name: string
  duration_seconds: number
}

// Exercise detail with audio URL
export interface CoCeExerciseDetail extends CoCeExercise {
  audio_url: string
  level: CoCeLevel
}

// Transcript structure
export interface CoCeTranscript {
  text: string
  segments?: Array<{
    text: string
    start_sec?: number
    end_sec?: number
  }>
}

// Question types
export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false_not_given"
  | "lexical_in_context"
  | "inference"
  | "author_intention"

// Individual question
export interface CoCeQuestion {
  id: string
  type: QuestionType
  question: string
  options: string[]
  correct_indices: number[]
  explanation: string
}

// Questions response
export interface CoCeQuestions {
  meta: {
    type: "compréhension_orale" | "compréhension_écrite"
    niveau: CoCeLevel
    titre: string
    consigne: string
    total_questions: number
  }
  questions: CoCeQuestion[]
}

// API responses
export interface CoCeExerciseListResponse {
  items: CoCeExercise[]
  level: CoCeLevel
}
