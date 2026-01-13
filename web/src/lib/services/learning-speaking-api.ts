import { apiClient } from "@/lib/services/api-client"
import type {
  SpeakingTopic,
  SpeakingTopicManifest,
  SpeakingPracticeContent,
  SpeakingTopicsResponse,
  SpeakingTopicManifestResponse,
  SpeakingContentResponse,
} from "@/lib/types/api/speaking-practice"

const BASE = "web/speaking-practice"

export const learningSpeakingApi = {
  /**
   * List all available speaking practice topics
   * GET /web/speaking-practice/topics
   */
  async listTopics(): Promise<SpeakingTopic[]> {
    const response = await apiClient.get<SpeakingTopicsResponse>(`${BASE}/topics`)
    return response.topics
  },

  /**
   * Get topic manifest with subtopics
   * GET /web/speaking-practice/topics/{topicId}
   */
  async getTopicManifest(topicId: string): Promise<SpeakingTopicManifest> {
    return apiClient.get<SpeakingTopicManifestResponse>(`${BASE}/topics/${topicId}`)
  },

  /**
   * Get practice content for a subtopic
   * GET /web/speaking-practice/content?path={path}
   */
  async getContent(path: string): Promise<SpeakingPracticeContent> {
    return apiClient.get<SpeakingContentResponse>(`${BASE}/content`, { path })
  },

  /**
   * Get audio URL for streaming
   * GET /web/speaking-practice/audio?path={path}
   */
  getAudioUrl(path: string): string {
    const encodedPath = encodeURIComponent(path)
    return `${apiClient.getBaseUrl()}/${BASE}/audio?path=${encodedPath}`
  },
}

export type {
  SpeakingTopic,
  SpeakingTopicManifest,
  SpeakingPracticeContent,
}
