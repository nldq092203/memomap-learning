import { apiClient } from "@/lib/services/api-client"
import type {
  CEFRLevel,
  CoCeLevel,
  CoCeExercise,
  CoCeTranscript,
  CoCeQuestions,
  CoCeExerciseListResponse,
} from "@/lib/types/api/coce"

const BASE = "web/coce"

export const learningCoCeApi = {
  /**
   * List all exercises for a given level
   * GET /web/coce/exercises?level=B2
   */
  async listExercises(level: CEFRLevel): Promise<CoCeExercise[]> {
    const response = await apiClient.get<CoCeExerciseListResponse>(
      `${BASE}/exercises`,
      { level }
    )
    return response.items
  },

  /**
   * Get exercise details including media URLs
   * GET /web/coce/exercises/{exerciseId}
   * Note: Level is removed from query params as backend provides full exercise data
   */
  async getExercise(exerciseId: string): Promise<CoCeExercise> {
    return apiClient.get<CoCeExercise>(
      `${BASE}/exercises/${exerciseId}`
    )
  },

  /**
   * Get transcript for an exercise
   * GET /web/coce/exercises/{exerciseId}/transcript
   */
  async getTranscript(exerciseId: string): Promise<CoCeTranscript> {
    return apiClient.get<CoCeTranscript>(
      `${BASE}/exercises/${exerciseId}/transcript`
    )
  },

  /**
   * Get questions for an exercise (CO or CE)
   * GET /web/coce/exercises/{exerciseId}/questions?type=co
   */
  async getQuestions(
    exerciseId: string,
    type: "co" | "ce"
  ): Promise<CoCeQuestions> {
    return apiClient.get<CoCeQuestions>(
      `${BASE}/exercises/${exerciseId}/questions`,
      { type }
    )
  },
}

export type { CEFRLevel, CoCeLevel, CoCeExercise, CoCeTranscript, CoCeQuestions }
