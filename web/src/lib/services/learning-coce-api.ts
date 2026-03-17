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
  async listExercises(
    level: CEFRLevel,
    topic?: string,
    guestMode = false,
  ): Promise<CoCeExercise[]> {
    const response = await apiClient.get<CoCeExerciseListResponse>(
      `${BASE}/exercises`,
      { level, topic, guest_mode: guestMode }
    )
    return response.items
  },

  /**
   * Get exercise details including media URLs
   * GET /web/coce/exercises/{exerciseId}
   * Note: Level is removed from query params as backend provides full exercise data
   */
  async getExercise(
    exerciseId: string,
    guestMode = false,
    topic?: string,
  ): Promise<CoCeExercise> {
    return apiClient.get<CoCeExercise>(
      `${BASE}/exercises/${exerciseId}`,
      { guest_mode: guestMode, topic }
    )
  },

  /**
   * Get transcript for an exercise
   * GET /web/coce/exercises/{exerciseId}/transcript
   */
  async getTranscript(
    exerciseId: string,
    guestMode = false,
    topic?: string,
  ): Promise<CoCeTranscript> {
    return apiClient.get<CoCeTranscript>(
      `${BASE}/exercises/${exerciseId}/transcript`,
      { guest_mode: guestMode, topic }
    )
  },

  /**
   * Get questions for an exercise (CO or CE)
   * GET /web/coce/exercises/{exerciseId}/questions?type=co
   */
  async getQuestions(
    exerciseId: string,
    type: "co" | "ce",
    guestMode = false,
    topic?: string,
  ): Promise<CoCeQuestions> {
    return apiClient.get<CoCeQuestions>(
      `${BASE}/exercises/${exerciseId}/questions`,
      { type, guest_mode: guestMode, topic }
    )
  },
}

export type { CEFRLevel, CoCeLevel, CoCeExercise, CoCeTranscript, CoCeQuestions }
