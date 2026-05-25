import { apiClient } from "@/lib/services/api-client"
import type {
  DelfLevel,
  DelfTestListResponse,
  DelfTestPaperDetailResponse,
} from "@/lib/types/api/delf"

const BASE = "web/delf"

function normalizeDelfAssetPath(filename: string): string {
  const path = filename.replace(/^\/+/, "")
  const withoutAssets = path.startsWith("assets/") ? path.slice("assets/".length) : path
  if (withoutAssets.includes("/")) {
    return path.startsWith("assets/") ? path : `assets/${path}`
  }

  const match = withoutAssets.match(/^tp-?(\d+)-q(\d+)(?:-p\d+)?-([a-z0-9_-]+)\.(?:webp|png|jpe?g)$/i)
  if (!match) {
    return path.startsWith("assets/") ? path : `assets/${path}`
  }

  const testId = `tp-${match[1].padStart(2, "0")}`
  const question = `q${match[2].padStart(2, "0")}`
  const label = match[3].toLowerCase()
  return `assets/${testId}/${question}/${label}.webp`
}

export const learningDelfApi = {
  /**
   * List all test papers for a given level and optional variant/section
   * GET /web/delf/tests?level=B2&section=CO
   */
  async listTests(
    level: DelfLevel,
    section?: string,
    variant?: string,
    guestMode = false,
  ): Promise<DelfTestListResponse["items"]> {
    const params: Record<string, string> = { level }
    if (section) params.section = section
    if (variant) params.variant = variant
    if (guestMode) params.guest_mode = "true"

    const response = await apiClient.get<DelfTestListResponse>(
      `${BASE}/tests`,
      params
    )
    return response.items
  },

  /**
   * Get full test paper details including content from GitHub
   * GET /web/delf/{level}/{variant}/{section}/{testId}
   */
  async getTest(
    testId: string,
    level: DelfLevel,
    variant: string,
    section: string,
    guestMode = false,
  ): Promise<DelfTestPaperDetailResponse> {
    return apiClient.get<DelfTestPaperDetailResponse>(
      `${BASE}/${level}/${variant}/${section}/${testId}`,
      guestMode ? { guest_mode: "true" } : undefined
    )
  },

  /**
   * Helper to construct proxied audio URLs
   */
  getAudioProxyUrl(level: string, variant: string, section: string, filename: string): string {
    const cleanFilename = filename.replace(/^\/+/, "").replace(/^(audio\/)+/i, "")
    return `${apiClient.getBaseUrl()}/${BASE}/audio/${level.toLowerCase()}/${variant}/${section}/audio/${cleanFilename}`
  },

  /**
   * Helper to construct proxied image asset URLs
   */
  getAssetUrl(level: string, variant: string, section: string, filename: string): string {
    const path = normalizeDelfAssetPath(filename)
    return `${apiClient.getBaseUrl()}/${BASE}/assets/${level.toLowerCase()}/${variant}/${section}/${path}`
  },
}
