// Generic AI ask
export interface AiAskRequest<TPayload = unknown> {
  type: string
  payload: TPayload
}

export interface AiAskResponse<TMeta = Record<string, unknown>> {
  id: string | null
  type: string
  // Backend may return structured JSON or string; we accept both
  content: unknown
  meta: TMeta
}

// Itinerary domain types
export interface ItineraryStop {
  id: string // reference to saved TravelResource.id
  time: string
  name: string
  note?: string
}

export interface ItineraryDay {
  day: number
  stops: ItineraryStop[]
}

// Envelope for multiple options (legacy or future multi-plan support)
export interface ItineraryOption {
  type: string
  days: ItineraryDay[]
}

export interface ItineraryEnvelope {
  options: ItineraryOption[]
}

// Preferred compact response shape (single best itinerary)
export interface ItineraryDaysResponse {
  days: ItineraryDay[]
}


// ---- Learning Assist / Chat types ----

export type CEFRLevel = "A2" | "B1" | "B2" | "C1"

export interface ExplainRequest {
  text: string
  learning_lang?: string
  native_lang?: string
  target_langs?: string[]
  level?: CEFRLevel
  include_synonyms?: boolean
  include_examples?: boolean
}

export interface ExplainMeta { isJson: boolean }
export interface ExplainResponse<T = unknown> { content: T; meta: ExplainMeta }

export interface ChatRequest {
  text?: string
  question: string
  learning_lang?: string
  native_lang?: string
  level?: CEFRLevel
  use_context?: boolean
  thread_id?: string | null
  history_max_turns?: number
}

export interface ChatResponse {
  conversation_id: string
  language: string
  message: string
  response: string
}

// ---- Specialized AI task types ----

export type AITaskType =
  | "quick_explain"
  | "deep_breakdown"
  | "generate_examples"
  | "grammar_check"
  | "create_mnemonic"

export interface AITaskMeta {
  isJson: boolean
  task: AITaskType
  error?: boolean
}

export interface AITaskResponse<T = unknown> {
  content: T
  meta: AITaskMeta
}

// Quick Explain
export interface QuickExplainRequest {
  text: string
  learning_lang?: string
  native_lang?: string
}

export interface QuickExplainData {
  word: string
  meaning: string
  pos: string
  pronunciation: string
  gender: string | null
  example: string
}

// Deep Breakdown
export interface DeepBreakdownRequest {
  text: string
  learning_lang?: string
  native_lang?: string
  level?: CEFRLevel
}

export interface DeepBreakdownData {
  word: string
  pronunciation: string
  pos: string
  meaning: string
  grammar: {
    structure: string
    tense_mood: string
    notes: string[]
  }
  nuance: {
    register: string
    frequency: string
    notes: string
  }
  synonyms: Array<{ word: string; diff: string }>
  delf_tips: {
    level: string
    usage: string
    section: string
  }
  collocations: string[]
  examples: Array<{ fr: string; translation: string }>
}

// Example Generator
export interface ExampleGeneratorRequest {
  text: string
  learning_lang?: string
  native_lang?: string
  level?: CEFRLevel
  count?: number
}

export interface ExampleGeneratorData {
  word: string
  level: string
  examples: Array<{
    fr: string
    translation: string
    audio_text: string
    context: string
  }>
}

// Grammar Check
export interface GrammarCheckRequest {
  text: string
  learning_lang?: string
  native_lang?: string
}

export interface GrammarError {
  text: string
  correction: string
  type: "spelling" | "grammar" | "accent" | "conjugation" | "agreement" | "punctuation"
  start_index: number
  end_index: number
  explanation: string
}

export interface GrammarCheckData {
  original: string
  corrected: string
  is_correct: boolean
  score: number
  errors: GrammarError[]
  suggestions: string[]
}

// Mnemonic Creator
export interface MnemonicRequest {
  text: string
  learning_lang?: string
  native_lang?: string
}

export interface MnemonicData {
  word: string
  meaning: string
  mnemonics: Array<{
    type: "sound" | "visual" | "story" | "acronym" | "association"
    trick: string
    explanation: string
  }>
  best_pick: string
}
