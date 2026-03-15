import { apiClient } from "@/lib/services/api-client"
import type {
  ExplainRequest,
  ExplainResponse,
  ChatRequest,
  ChatResponse,
  AITaskResponse,
  QuickExplainRequest,
  QuickExplainData,
  DeepBreakdownRequest,
  DeepBreakdownData,
  ExampleGeneratorRequest,
  ExampleGeneratorData,
  GrammarCheckRequest,
  GrammarCheckData,
  MnemonicRequest,
  MnemonicData,
} from "@/lib/types/api/ai"

export const aiService = {
  // Existing endpoints
  async explain(body: ExplainRequest): Promise<ExplainResponse> {
    return apiClient.post<ExplainResponse>("web/ai/assist", body)
  },
  async chat(body: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>("web/ai/chat", body)
  },

  // New specialized endpoints
  async quickExplain(body: QuickExplainRequest): Promise<AITaskResponse<QuickExplainData>> {
    return apiClient.post<AITaskResponse<QuickExplainData>>("web/ai/quick-explain", body)
  },
  async deepBreakdown(body: DeepBreakdownRequest): Promise<AITaskResponse<DeepBreakdownData>> {
    return apiClient.post<AITaskResponse<DeepBreakdownData>>("web/ai/deep-breakdown", body)
  },
  async generateExamples(body: ExampleGeneratorRequest): Promise<AITaskResponse<ExampleGeneratorData>> {
    return apiClient.post<AITaskResponse<ExampleGeneratorData>>("web/ai/examples", body)
  },
  async grammarCheck(body: GrammarCheckRequest): Promise<AITaskResponse<GrammarCheckData>> {
    return apiClient.post<AITaskResponse<GrammarCheckData>>("web/ai/grammar-check", body)
  },
  async createMnemonic(body: MnemonicRequest): Promise<AITaskResponse<MnemonicData>> {
    return apiClient.post<AITaskResponse<MnemonicData>>("web/ai/mnemonic", body)
  },
}
