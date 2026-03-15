"use client"

import { useCallback, useRef, useState } from "react"
import { aiService } from "@/lib/services/ai"
import type {
  CEFRLevel,
  ChatResponse,
  ExplainResponse,
  AITaskResponse,
  QuickExplainData,
  DeepBreakdownData,
  ExampleGeneratorData,
  GrammarCheckData,
  MnemonicData,
} from "@/lib/types/api/ai"
import { notificationService } from "@/lib/services/notification-service"

type Settings = {
  level: CEFRLevel
  target_langs: string[]
  learning_lang: string
  native_lang: string
}

const DEFAULT_SETTINGS: Settings = {
  level: "B1",
  target_langs: ["en", "vi"],
  learning_lang: "fr",
  native_lang: "vi",
}

type CacheEntry = { data: ExplainResponse; ts: number }
const TTL = 10 * 60 * 1000

const storeKey = "ai_assist_settings_v1"
const cache: Map<string, CacheEntry> = new Map()

async function sha1(input: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest("SHA-1", enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
  } catch {
    // Fallback
    let h = 0
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) - h) + input.charCodeAt(i)
      h |= 0
    }
    return String(h)
  }
}

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(storeKey)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (s: Settings) => {
  try { localStorage.setItem(storeKey, JSON.stringify(s)) } catch {}
}

function handleAIError(e: unknown, endpoint: string): never {
  const errorCode = (e as { response?: { status?: number; data?: { message?: string } } })?.response?.status
  const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message

  console.error("ai_error", { endpoint, code: errorCode })

  if (errorCode === 429) {
    notificationService.error(errorMessage || "Too many AI requests. Please wait and try again.")
  } else {
    notificationService.error("AI unavailable, try again")
  }
  throw e
}

export function useAiAssist(initial?: Partial<Settings>) {
  const [settings, setSettings] = useState<Settings>({ ...loadSettings(), ...initial })
  const [isExplaining, setIsExplaining] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  const [isTaskLoading, setIsTaskLoading] = useState(false)
  const [explain, setExplain] = useState<ExplainResponse | null>(null)
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [threadId, setThreadId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ai_thread_id') || null
    } catch {
      return null
    }
  })
  const [rateLimitError, setRateLimitError] = useState<{ message: string; retryAfter: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Task-specific results
  const [quickExplainResult, setQuickExplainResult] = useState<AITaskResponse<QuickExplainData> | null>(null)
  const [deepBreakdownResult, setDeepBreakdownResult] = useState<AITaskResponse<DeepBreakdownData> | null>(null)
  const [examplesResult, setExamplesResult] = useState<AITaskResponse<ExampleGeneratorData> | null>(null)
  const [grammarCheckResult, setGrammarCheckResult] = useState<AITaskResponse<GrammarCheckData> | null>(null)
  const [mnemonicResult, setMnemonicResult] = useState<AITaskResponse<MnemonicData> | null>(null)

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const cacheKeyFor = useCallback(async (body: { text?: string } & Record<string, unknown>) => {
    const keyObj = { ...body,
      text: body.text,
      learning_lang: settings.learning_lang,
      native_lang: settings.native_lang,
      target_langs: settings.target_langs,
      level: settings.level,
    }
    return sha1(JSON.stringify(keyObj))
  }, [settings])

  const explainText = useCallback(async (text: string, opts?: { include_synonyms?: boolean; include_examples?: boolean }) => {
    if (!text || !text.trim()) return null
    const body = {
      text: text.trim(),
      learning_lang: settings.learning_lang,
      native_lang: settings.native_lang,
      target_langs: settings.target_langs,
      level: settings.level,
      include_synonyms: opts?.include_synonyms ?? true,
      include_examples: opts?.include_examples ?? true,
    }
    const key = await cacheKeyFor(body)
    const now = Date.now()
    const cached = cache.get(key)
    if (cached && (now - cached.ts) < TTL) {
      setExplain(cached.data)
      return cached.data
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setIsExplaining(true)
    try {
      const res = await aiService.explain(body)
      cache.set(key, { data: res, ts: now })
      setExplain(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/assist")
    } finally {
      setIsExplaining(false)
    }
  }, [settings, cacheKeyFor])

  const askMore = useCallback(async (question: string, contextText?: string, useContext: boolean = true) => {
    if (!question.trim()) return null
    const body = {
      question: question.trim(),
      text: useContext ? (contextText || "") : undefined,
      learning_lang: settings.learning_lang,
      native_lang: settings.native_lang,
      level: settings.level,
      use_context: useContext,
      thread_id: threadId,
      history_max_turns: 5,
    }
    setIsChatting(true)
    try {
      setChat(prev => [...prev, { role: "user", content: body.question }])
      const res: ChatResponse = await aiService.chat(body)
      setChat(prev => [...prev, { role: "assistant", content: res.response }])
      if (res.conversation_id && res.conversation_id !== threadId) {
        setThreadId(res.conversation_id)
        try { localStorage.setItem('ai_thread_id', res.conversation_id) } catch {}
      } else if (!threadId) {
        const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        setThreadId(id)
        try { localStorage.setItem('ai_thread_id', id) } catch {}
      }
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/chat")
    } finally {
      setIsChatting(false)
    }
  }, [settings, threadId])

  // ── New specialized task methods ──

  const quickExplain = useCallback(async (text: string) => {
    if (!text.trim()) return null
    setIsTaskLoading(true)
    setQuickExplainResult(null)
    try {
      const res = await aiService.quickExplain({
        text: text.trim(),
        learning_lang: settings.learning_lang,
        native_lang: settings.native_lang,
      })
      setQuickExplainResult(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/quick-explain")
    } finally {
      setIsTaskLoading(false)
    }
  }, [settings])

  const deepBreakdown = useCallback(async (text: string) => {
    if (!text.trim()) return null
    setIsTaskLoading(true)
    setDeepBreakdownResult(null)
    try {
      const res = await aiService.deepBreakdown({
        text: text.trim(),
        learning_lang: settings.learning_lang,
        native_lang: settings.native_lang,
        level: settings.level,
      })
      setDeepBreakdownResult(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/deep-breakdown")
    } finally {
      setIsTaskLoading(false)
    }
  }, [settings])

  const generateExamples = useCallback(async (text: string, count?: number) => {
    if (!text.trim()) return null
    setIsTaskLoading(true)
    setExamplesResult(null)
    try {
      const res = await aiService.generateExamples({
        text: text.trim(),
        learning_lang: settings.learning_lang,
        native_lang: settings.native_lang,
        level: settings.level,
        count: count ?? 3,
      })
      setExamplesResult(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/examples")
    } finally {
      setIsTaskLoading(false)
    }
  }, [settings])

  const grammarCheck = useCallback(async (text: string) => {
    if (!text.trim()) return null
    setIsTaskLoading(true)
    setGrammarCheckResult(null)
    try {
      const res = await aiService.grammarCheck({
        text: text.trim(),
        learning_lang: settings.learning_lang,
        native_lang: settings.native_lang,
      })
      setGrammarCheckResult(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/grammar-check")
    } finally {
      setIsTaskLoading(false)
    }
  }, [settings])

  const createMnemonic = useCallback(async (text: string) => {
    if (!text.trim()) return null
    setIsTaskLoading(true)
    setMnemonicResult(null)
    try {
      const res = await aiService.createMnemonic({
        text: text.trim(),
        learning_lang: settings.learning_lang,
        native_lang: settings.native_lang,
      })
      setMnemonicResult(res)
      return res
    } catch (e: unknown) {
      handleAIError(e, "web/ai/mnemonic")
    } finally {
      setIsTaskLoading(false)
    }
  }, [settings])

  return {
    // Settings
    settings,
    updateSettings,

    // Existing: explain + chat
    isExplaining,
    isChatting,
    explain,
    chat,
    explainText,
    askMore,
    threadId,
    setThreadId,

    // New specialized tasks
    isTaskLoading,
    quickExplain,
    quickExplainResult,
    deepBreakdown,
    deepBreakdownResult,
    generateExamples,
    examplesResult,
    grammarCheck,
    grammarCheckResult,
    createMnemonic,
    mnemonicResult,

    // Rate limit
    rateLimitError,
    clearRateLimitError: () => setRateLimitError(null),
  }
}
