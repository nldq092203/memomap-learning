import { apiClient } from "@/lib/services/api-client"
import type { ExplainRequest, ExplainResponse, ChatRequest, ChatResponse } from "@/lib/types/api/ai"

export const aiService = {
  async explain(body: ExplainRequest): Promise<ExplainResponse> {
    // Endpoint baseURL is /api/web via apiClient; use relative path
    return apiClient.post<ExplainResponse>("web/ai/assist", body)
  },
  async chat(body: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>("web/ai/chat", body)
  }
}
