import { apiClient } from "@/lib/services/api-client"
import type { LearningVocabCard, VocabListResponse, ReviewGrade } from "@/lib/types/learning-vocab"
import type { VocabStats } from "@/lib/types/learning-vocab"

export type ReviewBatchResult = {
  updated: number
  results: Array<{ id: string | null; ok: boolean; queued?: boolean; error?: string }>
}

export const learningVocabApi = {
  async list(params: {
    language: string
    q?: string
    status?: string
    last_grade?: string
    tag?: string
    due_before?: string
    limit?: number
    offset?: number
  }) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length > 0) search.append(k, String(v))
    })
    return apiClient.get<VocabListResponse>(`/web/vocab?${search.toString()}`)
  },

  async due(language: string, limit = 20) {
    const search = new URLSearchParams({ language, limit: String(limit) })
    return apiClient.get<{ cards: LearningVocabCard[]; count: number }>(`/web/vocab/due?${search.toString()}`)
  },

  async stats(language: string) {
    const search = new URLSearchParams({ language })
    return apiClient.get<VocabStats>(`/web/vocab/stats?${search.toString()}`)
  },

  async get(cardId: string, language: string) {
    const search = new URLSearchParams({ language })
    return apiClient.get<LearningVocabCard>(`/web/vocab/${cardId}?${search.toString()}`)
  },

  async reviewBatch(reviews: { card_id: string; grade: ReviewGrade }[]): Promise<ReviewBatchResult> {
    return apiClient.post<ReviewBatchResult>(`/web/vocab:review-batch`, { reviews })
  },

  async bulkImport(
    language: string,
    cards: Array<{
      word: string
      translation: string | null
      notes: string[]
      tags: string[]
    }>
  ): Promise<VocabListResponse> {
    if (!cards.length) {
      return {
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
      }
    }

    const baseCard = cards[0]
    const created = await apiClient.post<LearningVocabCard>(`/web/vocab`, {
      language,
      word: baseCard.word,
      translation: baseCard.translation,
      notes: baseCard.notes,
      tags: baseCard.tags,
    })

    return {
      items: [created],
      total: 1,
      limit: 1,
      offset: 0,
    }
  },

  async update(cardId: string, payload: Partial<LearningVocabCard> & { language: string }): Promise<LearningVocabCard> {
    return apiClient.patch<LearningVocabCard>(`/web/vocab/${cardId}`, payload)
  },

  async remove(cardId: string) {
    return apiClient.delete<{ ok: boolean }>(`/web/vocab/${cardId}`)
  },

  async hardRemove(cardId: string, language?: string) {
    const search = new URLSearchParams()
    if (language) {
      search.append("language", language)
    }
    const suffix = search.toString() ? `?${search.toString()}` : ""
    return apiClient.delete<{ ok: boolean; deleted?: boolean }>(
      `/web/vocab/${cardId}/hard${suffix}`,
    )
  }
}
