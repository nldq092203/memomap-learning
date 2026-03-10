// DELF Practice API Types

// CEFR levels supported
export type DelfLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

// Exam Sections
export type DelfSection = 'CO' | 'CE' | 'PE' | 'PO'

// Media types
export type DelfStatus = 'active' | 'draft' | 'archived'

// Exercise types
export type DelfExerciseType = 
  | 'multiple_choice' 
  | 'multiple_choice_image' 
  | 'matching' 
  | 'document_comprehension' 
  | 'article_comprehension'
  | 'multi_document_comprehension'
  | 'multiple_choice_set'

// Question Content Models (matching GitHub JSON structure)
export interface DelfImageOption {
  label: string
  img_url: string
  desc?: string
}

export interface DelfDocument {
  id: string
  title: string
  content: string
}

export interface DelfPerson {
  label: string
  description: string
}

export interface DelfEmailPart {
  label: string
  excerpt: string
}

export interface DelfReadingDocument {
  type?: string
  title?: string
  content?: string
  sender?: string
  subject?: string
  body?: string
  parts?: DelfEmailPart[]
}

export interface DelfLabelOption {
  number: number
  description: string
}

export interface DelfSubQuestion {
  id: string
  number?: number
  question_text: string
  type: string // "single_choice", "multiple_choice", "multiple_choice_image", "label_matching", "multiple_select_image", "true_false"
  points?: number
  
  // MCQ / Single Choice
  options?: (string | DelfImageOption)[]
  correct_answer?: number
  explanation?: string
  
  // Label matching / multi-select
  labels?: DelfLabelOption[]
  correct_answers?: Record<string, number> | string[]
}

export interface DelfExercise {
  id: string
  title: string
  question_text?: string
  type: DelfExerciseType
  instruction?: string

  // --- Nested Questions & Documents ---
  document?: DelfReadingDocument
  questions?: DelfSubQuestion[]

  // --- Flat MCQ fields (Legacy/Flat format) ---
  options?: (string | DelfImageOption)[]
  correct_answer?: number
  points?: number
  transcript?: string
  explanation?: string

  // --- Matching fields ---
  documents?: DelfDocument[]
  persons?: DelfPerson[]
  correct_answers?: Record<string, string>    // e.g. {"doc_1": "E"}
  unmatched_persons?: string[]
  explanations?: Record<string, string>       // e.g. {"doc_1": "...", "A": "..."}
}

export interface DelfExtraTranscript {
  id: string
  content: string
}

export interface DelfTestPaperContent {
  test_id: string
  section: string
  audio_filename?: string
  exercises: DelfExercise[]
  extra_transcripts: DelfExtraTranscript[]
}

// API Responses (metadata from DB)
export interface DelfTestPaperResponse {
  id: string
  test_id: string
  level: DelfLevel
  variant: string
  section: DelfSection
  exercise_count: number
  audio_filename?: string
  status: DelfStatus
  created_at: string
}

// Full API Response with Content (from DB + GitHub)
export interface DelfTestPaperDetailResponse extends DelfTestPaperResponse {
  updated_at: string
  github_path: string
  content: DelfTestPaperContent
  audio_url?: string
}

// Check if an option is an image option
export function isImageOption(option: string | DelfImageOption): option is DelfImageOption {
  return typeof option === 'object' && option !== null && 'img_url' in option
}

export interface DelfTestListResponse {
  items: DelfTestPaperResponse[]
  level: DelfLevel
}

// --- Matching answer types ---
export interface MatchingAnswer {
  exerciseId: string
  selections: Record<string, string>  // { doc_id -> person_label }
}
