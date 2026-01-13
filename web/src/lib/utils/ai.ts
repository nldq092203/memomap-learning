import type { ItineraryEnvelope, ItineraryDay } from '@/lib/types/api/ai'

// Parse itinerary envelope from either structured JSON (object/array) or string
export const parseItineraryEnvelope = (rawOrJson: unknown): ItineraryEnvelope | null => {
  // 1) Structured objects
  if (rawOrJson && typeof rawOrJson === 'object') {
    const obj = rawOrJson as Record<string, unknown>
    if (Array.isArray(obj.options)) return obj as unknown as ItineraryEnvelope
    if (Array.isArray(obj.days)) return { options: [{ type: 'Best', days: obj.days as ItineraryDay[] }] }
    if (Array.isArray(obj)) return { options: [{ type: 'Best', days: obj as ItineraryDay[] }] }
    if (typeof obj.day === 'number' && Array.isArray(obj.stops)) return { options: [{ type: 'Best', days: [obj as unknown as ItineraryDay] }] }
  }

  const attempt = (text: string) => {
    try {
      const obj = JSON.parse(text)
      if (Array.isArray(obj.options)) return obj as unknown as ItineraryEnvelope
      if (Array.isArray(obj.days)) return { options: [{ type: 'Best', days: obj.days as ItineraryDay[] }] }
      if (Array.isArray(obj)) return { options: [{ type: 'Best', days: obj as ItineraryDay[] }] }
      if (typeof obj.day === 'number' && Array.isArray(obj.stops)) return { options: [{ type: 'Best', days: [obj as unknown as ItineraryDay] }] }
      return null
    } catch { return null }
  }

  // 2) Strings with possible code fences or trailing text
  const raw = rawOrJson ?? ''
  const text = typeof raw === 'string' ? raw : String(raw)
  const trimmed = text.trim()
  const fence = trimmed.match(/```[a-zA-Z]*\n([\s\S]*?)```/)
  let candidate = fence ? fence[1] : trimmed
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  candidate = first >= 0 ? candidate.slice(first, last >= 0 ? last + 1 : undefined) : candidate

  const parsed = attempt(candidate)
  if (parsed) return parsed

  // Try small trims if the JSON is slightly truncated
  for (let i = candidate.length; i > Math.max(0, candidate.length - 200); i--) {
    const part = candidate.slice(0, i)
    const p = attempt(part)
    if (p) return p
  }
  return null
}


