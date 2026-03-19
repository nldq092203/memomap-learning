import { apiClient } from "@/lib/services/api-client"

export interface CommunityFeedback {
  _id: string
  user_id: string
  email: string
  content: string
  status: "planned" | "in-progress" | "done"
  created_at: string
}

export const communityApi = {
  async getFeedbacks(): Promise<CommunityFeedback[]> {
    return apiClient.get<CommunityFeedback[]>("/web/community")
  },

  async postFeedback(content: string): Promise<CommunityFeedback> {
    return apiClient.post<CommunityFeedback>("/web/community", { content })
  },

  async updateFeedback(
    id: string,
    data: { content?: string; status?: string }
  ): Promise<CommunityFeedback> {
    return apiClient.put<CommunityFeedback>(`/web/community/${id}`, data)
  },

  async deleteFeedback(id: string): Promise<void> {
    return apiClient.delete<void>(`/web/community/${id}`)
  },
}
