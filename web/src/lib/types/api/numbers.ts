export type NumbersType =
  | "PHONE"
  | "YEAR"
  | "PRICE"
  | "TIME"
  | "ADDRESS"
  | "STATISTICS"
  | "MEDICAL"
  | "BANKING"
  | "WEATHER"
  | "TRANSPORT"
  | "QUANTITY"

export interface NumbersSessionCreateRequest {
  types: NumbersType[]
  count: number
  // Optional here; backend provides defaults when omitted
  language?: string
  difficulty?: "easy" | "medium" | "hard"
}

export interface NumbersSessionCreateResponse {
  session_id: string
  types: NumbersType[]
  // New DB-backed API field
  total_exercises?: number
  // Backwards compat with older shape
  count?: number
}

export interface NumbersNextExerciseResponse {
  session_id: string
  done: boolean
  exercise: null | {
    id: string
    number_type: NumbersType
    audio_ref: string
    blueprint_id: string | null
  }
}

export interface NumbersAnswerRequest {
  exercise_id: string
  answer: string
}

export interface NumbersAnswerError {
  index: number
  expected: string
  got: string
}

export interface NumbersAnswerResponse {
  session_id: string
  exercise_id: string
  is_correct: boolean
  errors: NumbersAnswerError[]
}

export interface NumbersPerTypeStats {
  number_type: NumbersType
  total: number
  correct: number
  incorrect: number
}

export interface NumbersSessionSummaryResponse {
  session_id: string
  total_exercises: number
  answered: number
  correct: number
  incorrect: number
  score: number
  per_type: NumbersPerTypeStats[]
  extra?: Record<string, unknown> | null
}
