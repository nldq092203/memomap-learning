import { apiClient } from "@/lib/services/api-client"

export interface CommunityFeedback {
  _id: string
  user_id: string
  display_name: string
  content: string
  status: "planned" | "in-progress" | "done"
  is_incognito: boolean
  created_at: string
  updated_at?: string
}

export const communityApi = {
  async getFeedbacks(): Promise<CommunityFeedback[]> {
    return apiClient.get<CommunityFeedback[]>("/web/community")
  },

  async postFeedback(content: string, isIncognito = false): Promise<CommunityFeedback> {
    return apiClient.post<CommunityFeedback>("/web/community", {
      content,
      is_incognito: isIncognito,
    })
  },

  async updateFeedback(
    id: string,
    data: { content?: string; status?: string; is_incognito?: boolean }
  ): Promise<CommunityFeedback> {
    return apiClient.put<CommunityFeedback>(`/web/community/${id}`, data)
  },

  async deleteFeedback(id: string): Promise<void> {
    return apiClient.delete<void>(`/web/community/${id}`)
  },
}
