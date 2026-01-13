import { apiClient } from "@/lib/services/api-client"
import type {
  NumbersAnswerRequest,
  NumbersAnswerResponse,
  NumbersAnswerError,
  NumbersNextExerciseResponse,
  NumbersSessionCreateRequest,
  NumbersSessionCreateResponse,
  NumbersSessionSummaryResponse,
  NumbersType,
} from "@/lib/types/api/numbers"

const BASE = "web/numbers"

export const learningNumbersApi = {
  async createSession(
    payload: NumbersSessionCreateRequest,
  ): Promise<NumbersSessionCreateResponse> {
    return apiClient.post<NumbersSessionCreateResponse>(`${BASE}/sessions`, payload)
  },

  async getNextExercise(sessionId: string): Promise<NumbersNextExerciseResponse> {
    return apiClient.get<NumbersNextExerciseResponse>(
      `${BASE}/sessions/${sessionId}/next`,
    )
  },

  async submitAnswer(
    sessionId: string,
    body: NumbersAnswerRequest,
  ): Promise<NumbersAnswerResponse> {
    return apiClient.post<NumbersAnswerResponse>(
      `${BASE}/sessions/${sessionId}/answer`,
      body,
    )
  },

  async getSummary(sessionId: string): Promise<NumbersSessionSummaryResponse> {
    return apiClient.get<NumbersSessionSummaryResponse>(
      `${BASE}/sessions/${sessionId}/summary`,
    )
  },

  getAudioUrl(audioRef: string): string {
    return `${apiClient.getBaseUrl()}${BASE}/audio/${audioRef}`
  },
}

export type {
  NumbersType,
  NumbersSessionCreateRequest,
  NumbersSessionCreateResponse,
  NumbersNextExerciseResponse,
  NumbersAnswerError,
  NumbersAnswerRequest,
  NumbersAnswerResponse,
  NumbersSessionSummaryResponse,
}
