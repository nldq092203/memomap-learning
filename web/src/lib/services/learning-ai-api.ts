import { apiClient } from '@/lib/services/api-client'

export interface ExplainRequest {
  text: string
  language: string
  context?: string
}

export interface WordBreakdown {
  word: string
  meaning: string
  grammar?: string
}

export interface ExplainResponse {
  explanation: string
  breakdown?: WordBreakdown[]
}

export interface ChatRequest {
  message: string
  language: string
  conversation_id?: string
}

export interface ChatResponse {
  response: string
  conversation_id: string
}

export const learningAiApi = {
  async explain(payload: ExplainRequest): Promise<ExplainResponse> {
    return apiClient.post<ExplainResponse>(`/web/ai/explain`, payload)
  },

  async chat(payload: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>(`/web/ai/chat`, payload)
  },
}

