import { apiClient } from "@/lib/services/api-client"
import { requestCache } from "@/lib/utils/request-cache"
import type { LearningAnalytics } from "@/lib/types/learning-vocab"
import type {
  LearningSession as ApiLearningSession,
  SessionListResponse as ApiSessionListResponse,
} from "@/lib/types/api/learning"

export type LearningLanguage = "fr" | "en"
export const LEARNING_LANGS: LearningLanguage[] = ["fr", "en"]

export interface AudioLessonTimestampSegment {
  text: string
  startSec: number
  endSec: number
}

// Standalone learning transcript (dictation content)
export interface LearningTranscriptPayload {
  language: LearningLanguage
  source_url?: string | null
  lesson_audio_folder_id?: string | null
  transcript?: string | null
  notes?: string | null
  comments?: string | null
  tags?: string[]
  extra?: Record<string, unknown>
}

export interface LearningTranscript extends LearningTranscriptPayload {
  id: string
  created_at: string | number
  updated_at: string
}


export interface AudioLessonSaveParams {
  audio: File
  transcript: string
  id?: string
  language?: LearningLanguage
  durationSeconds?: number | null
  timestamps?: AudioLessonTimestampSegment[] | null
  name?: string
}

export interface AudioLessonSaveResponse {
  lesson_id: string
  folder_id: string
  audio_file: { id: string; name: string }
  transcript_file: { id: string; name: string }
}

export interface AudioLessonListItem {
  id: string
  name: string
  language: string
  duration_seconds?: number | null
  created_at?: string
  updated_at?: string
  durationSeconds?: number | null
  audioFileName?: string
  audioFileSizeBytes?: number | null
}

export interface AudioLessonsListResponse {
  lessons: AudioLessonListItem[]
  nextPageToken?: string
}

export interface AudioLessonDetail extends AudioLessonListItem {
  duration_seconds?: number
  transcript?: string
  audio_filename?: string
  audio_mime_type?: string
  timestamps?: AudioLessonTimestampSegment[]
}

export const learningApi = {
  async getAnalytics(
    language: LearningLanguage,
    days: number = 30,
    minMinutes: number = 0
  ): Promise<LearningAnalytics> {
    const params = new URLSearchParams({
      language,
      days: String(days),
      min_minutes: String(minMinutes),
    })

    const cacheKey = requestCache.generateKey('GET', '/web/analytics', { language, days, minMinutes })
    const cachedData = requestCache.get(cacheKey)
    if (cachedData) {
      console.log(`Using cached analytics for ${language}`)
      return cachedData as LearningAnalytics
    }

    try {
      const response = await apiClient.get<LearningAnalytics>(`/web/analytics?${params.toString()}`)
      requestCache.set(cacheKey, response, 60000) // Cache for 1 minute
      return response
    } catch (_error) {
      console.warn('getAnalytics endpoint not available, returning empty data')
      return {
        today_minutes: 0,
        avg_minutes_7d: 0,
        avg_minutes_30d: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        daily: [],
      }
    }
  },
  async getAudioLessons(
    language?: LearningLanguage,
    pageSize: number = 20,
    pageToken?: string
  ): Promise<AudioLessonsListResponse> {
    const params: Record<string, unknown> = {
      pageSize,
    }
    if (language) {
      params.language = language
    }
    if (pageToken) {
      params.pageToken = pageToken
    }

    const response = await apiClient.get<{
      items: AudioLessonListItem[]
      next_page_token?: string | null
    }>(`/web/audio-lessons`, params)

    return {
      lessons: response.items || [],
      nextPageToken: response.next_page_token ?? undefined,
    }
  },
  async getAudioLessonDetail(lessonId: string): Promise<AudioLessonDetail> {
    return apiClient.get<AudioLessonDetail>(`/web/audio-lessons/${lessonId}/transcript`)
  },
  /**
   * Get a streamable audio URL for a given lesson.
   * This can be used directly as the src attribute of an <audio> element.
   */
  getAudioLessonAudioUrl(lessonId: string): string {
    // Keep the path shape consistent with the transcript endpoint.
    // Our lesson ids only contain URL-safe characters (letters, digits,
    // hyphens and the occasional colon), so we can embed them directly
    // without encoding to avoid introducing "%3A" into the path.
    return `${apiClient.getBaseUrl()}/web/audio-lessons/${lessonId}/audio`
  },
  // Standalone transcript CRUD
  async createTranscript(payload: LearningTranscriptPayload): Promise<LearningTranscript> {
    return apiClient.post<LearningTranscript>(`/web/transcripts`, payload)
  },
  async getTranscript(
    transcriptId: string,
    language: LearningLanguage,
  ): Promise<LearningTranscript> {
    return apiClient.get<LearningTranscript>(`/web/transcripts/${transcriptId}`, {
      language,
    })
  },
  async updateTranscript(
    transcriptId: string,
    payload: LearningTranscriptPayload,
  ): Promise<LearningTranscript> {
    return apiClient.put<LearningTranscript>(`/web/transcripts/${transcriptId}`, payload)
  },
  async deleteTranscript(transcriptId: string, language: LearningLanguage) {
    const url = `/web/transcripts/${transcriptId}?language=${language}`
    return apiClient.delete<{ ok: boolean; deleted?: boolean }>(url)
  },
  async createSession(payload: {
    language: LearningLanguage
    name: string
    duration_seconds: number
    tags?: string[]
    extra?: Record<string, unknown>
  }): Promise<ApiLearningSession> {
    return apiClient.post<ApiLearningSession>(`/web/sessions`, payload)
  },
  // Backwards-compat alias for legacy "time session" naming
  async createTimeSession(payload: {
    language: LearningLanguage
    name: string
    duration_seconds: number
  }): Promise<ApiLearningSession> {
    return apiClient.post<ApiLearningSession>(`/web/sessions`, payload)
  },
  async saveAudioLesson(params: AudioLessonSaveParams): Promise<AudioLessonSaveResponse> {
    const formData = new FormData()
    formData.append("audio", params.audio)
    formData.append("transcript", params.transcript)

    if (params.id) {
      formData.append("id", params.id)
    }
    if (params.language) {
      formData.append("language", params.language)
    }
    if (params.durationSeconds != null) {
      formData.append("duration", String(params.durationSeconds))
    }
    if (params.timestamps != null) {
      formData.append("timestamps", JSON.stringify(params.timestamps))
    }
    if (params.name) {
      formData.append("name", params.name)
    }

    return apiClient.postForm<AudioLessonSaveResponse>(`/web/audio-lessons`, formData)
  },
  async getSessions(
    language: LearningLanguage,
    pageSize: number = 20,
    pageToken?: string,
    bypassCache: boolean = false,
  ): Promise<{ sessions: ApiLearningSession[]; nextPageToken?: string }> {
    const params: Record<string, unknown> = {
      language,
      pageSize,
    }
    if (pageToken) {
      params.pageToken = pageToken
    }

    const cacheKey = requestCache.generateKey("GET", "/web/sessions", {
      language,
      pageSize,
    })

    // Only cache the first page when not bypassing
    if (!pageToken && !bypassCache) {
      const cachedData = requestCache.get<ApiSessionListResponse>(cacheKey)
      if (cachedData) {
        return {
          sessions: cachedData.items ?? [],
          nextPageToken: cachedData.next_page_token ?? undefined,
        }
      }
    }

    try {
      const response = await apiClient.get<ApiSessionListResponse>(`/web/sessions`, params)

      // Cache the first page for 30 seconds
      if (!pageToken) {
        requestCache.set(cacheKey, response, 30000)
      }

      return {
        sessions: response.items ?? [],
        nextPageToken: response.next_page_token ?? undefined,
      }
    } catch (_error) {
      // If the endpoint doesn't exist yet, return an empty result
      console.warn("getSessions endpoint not available, returning empty data")
      return { sessions: [], nextPageToken: undefined }
    }
  },
  async getSessionById(sessionId: string): Promise<ApiLearningSession> {
    try {
      return await apiClient.get<ApiLearningSession>(`/web/sessions/${sessionId}`)
    } catch (error) {
      console.error('Failed to fetch session details:', error)
      throw error
    }
  },
  async deleteSession(sessionId: string, language: LearningLanguage) {
    const url = `/web/sessions/${sessionId}?language=${language}`
    return apiClient.delete<{ ok: boolean; deleted?: boolean }>(url)
  },
}
