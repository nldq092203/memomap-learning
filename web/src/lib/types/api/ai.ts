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
