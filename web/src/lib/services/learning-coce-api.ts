import { apiClient } from "@/lib/services/api-client"
import type {
  CoCeLevel,
  CoCeExercise,
  CoCeExerciseDetail,
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
  async listExercises(level: CoCeLevel): Promise<CoCeExercise[]> {
    const response = await apiClient.get<CoCeExerciseListResponse>(
      `${BASE}/exercises`,
      { level }
    )
    return response.items
  },

  /**
   * Get exercise details including audio URL
   * GET /web/coce/exercises/{exerciseId}?level=B2
   */
  async getExercise(
    exerciseId: string,
    level: CoCeLevel
  ): Promise<CoCeExerciseDetail> {
    return apiClient.get<CoCeExerciseDetail>(
      `${BASE}/exercises/${exerciseId}`,
      { level }
    )
  },

  /**
   * Get transcript for an exercise
   * GET /web/coce/exercises/{exerciseId}/transcript?level=B2
   */
  async getTranscript(
    exerciseId: string,
    level: CoCeLevel
  ): Promise<CoCeTranscript> {
    const response = await apiClient.get<{
      id: string
      name: string
      language: string
      transcript: string
      duration_seconds: number
      audio_filename: string
      audio_mime_type: string
      created_at: string
      updated_at: string
    }>(
      `${BASE}/exercises/${exerciseId}/transcript`,
      { level }
    )

    // Transform to expected format
    return {
      text: response.transcript
    }
  },

  /**
   * Get questions for an exercise (CO or CE)
   * GET /web/coce/exercises/{exerciseId}/questions?level=B2&type=co
   */
  async getQuestions(
    exerciseId: string,
    level: CoCeLevel,
    type: "co" | "ce"
  ): Promise<CoCeQuestions> {
    return apiClient.get<CoCeQuestions>(
      `${BASE}/exercises/${exerciseId}/questions`,
      { level, type }
    )
  },

  /**
   * Get audio URL for direct playback in <audio> element
   */
  getAudioUrl(exerciseId: string, level: CoCeLevel): string {
    return `${apiClient.getBaseUrl()}/${BASE}/exercises/${exerciseId}/audio?level=${level}`
  },
}

export type { CoCeLevel, CoCeExercise, CoCeExerciseDetail, CoCeTranscript, CoCeQuestions }
