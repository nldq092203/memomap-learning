import { useState, useEffect, useCallback, useRef } from "react"
import { LEARNING_LANGS, learningApi, type LearningLanguage } from "@/lib/services/learning-api"
import type { SessionSummary } from "@/lib/types/learning-session"

export interface UseRecentSessionsReturn {
  sessions: SessionSummary[]
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  refreshSessions: () => Promise<void>
  loadMoreSessions: () => Promise<void>
  updateLastAccessed: (sessionId: string) => Promise<void>
}

export const useRecentSessions = (filterLanguage?: LearningLanguage): UseRecentSessionsReturn => {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const defaultLanguage = LEARNING_LANGS[0]
  
  // Track pagination state per language
  const [nextPageTokens, setNextPageTokens] = useState<Record<LearningLanguage, string | undefined>>(
    () =>
      Object.fromEntries(
        LEARNING_LANGS.map(language => [language, undefined]),
      ) as Record<LearningLanguage, string | undefined>,
  )

  // Track if we've made the initial backend fetch
  const hasInitialBackendFetch = useRef<boolean>(false)
  // Track initial fetch per language (for filtered mode)
  const hasFetchedByLang = useRef<Record<LearningLanguage, boolean>>(
    Object.fromEntries(
      LEARNING_LANGS.map(language => [language, false]),
    ) as Record<LearningLanguage, boolean>,
  )
  const isBackendFetching = useRef<boolean>(false)

  // Load sessions from backend
  const loadBackendSessions = useCallback(async (force: boolean = false, append: boolean = false) => {
    // Prevent concurrent requests
    if (isBackendFetching.current) {
      console.log("Backend fetch already in progress, skipping")
      return
    }

    // Skip if we already made the initial fetch and this is not a forced refresh
    if (!force && !append) {
      if (filterLanguage) {
        if (hasFetchedByLang.current[filterLanguage]) {
          console.log(`Backend fetch for ${filterLanguage} already completed, skipping`)
          return
        }
      } else if (hasInitialBackendFetch.current) {
        console.log("Backend fetch already completed, skipping")
        return
      }
    }

    try {
      isBackendFetching.current = true
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsRefreshing(true)
      }
      
      console.log('Fetching sessions from backend...', { append, force })
      
      if (filterLanguage) {
        const result = await learningApi.getSessions(
          filterLanguage,
          20,
          append ? nextPageTokens[filterLanguage] : undefined,
          force,
        )

        // Update pagination tokens for selected language only
        setNextPageTokens(prev => ({
          ...prev,
          [filterLanguage]: result.nextPageToken,
        }))

        const allSessions = Array.isArray(result.sessions) ? result.sessions : []
        console.log(`${filterLanguage.toUpperCase()} sessions result:`, allSessions.length)

        const mapped: SessionSummary[] = allSessions.map(s => ({
          id: s.id,
          title: s.name,
          language: s.language,
          duration: s.duration_seconds,
          status: "saved",
          createdAt: s.created_at,
          updatedAt: s.updated_at ?? s.created_at,
          lastAccessedAt: s.updated_at ?? s.created_at,
          isBackedUp: true,
          backendId: s.id,
        }))

        setSessions(prev =>
          append ? [...prev, ...mapped] : mapped,
        )

        // Mark language as fetched (initial)
        if (!append) {
          hasFetchedByLang.current[filterLanguage] = true
        }
      } else {
        const result = await learningApi.getSessions(
          defaultLanguage,
          20,
          append ? nextPageTokens[defaultLanguage] : undefined,
          force,
        )

        console.log(`${defaultLanguage.toUpperCase()} sessions result:`, result.sessions.length)

        setNextPageTokens(prev => ({
          ...prev,
          [defaultLanguage]: result.nextPageToken,
        }))

        const allSessions = Array.isArray(result.sessions) ? result.sessions : []
        
        const mapped: SessionSummary[] = allSessions.map(s => ({
          id: s.id,
          title: s.name,
          language: s.language,
          duration: s.duration_seconds,
          status: "saved",
          createdAt: s.created_at,
          updatedAt: s.updated_at ?? s.created_at,
          lastAccessedAt: s.updated_at ?? s.created_at,
          isBackedUp: true,
          backendId: s.id,
        }))

        setSessions(prev =>
          append ? [...prev, ...mapped] : mapped,
        )

        if (!append && !filterLanguage) {
          hasInitialBackendFetch.current = true
        }
      }
      
      setError(null)
    } catch (err) {
      console.error("Error loading backend sessions:", err)
      setError("Failed to load sessions")
    } finally {
      setIsRefreshing(false)
      setIsLoadingMore(false)
      isBackendFetching.current = false
    }
  }, [nextPageTokens, filterLanguage, defaultLanguage])

  // Update last accessed timestamp
  const updateLastAccessed = useCallback(async (sessionId: string) => {
    try {
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, lastAccessedAt: new Date().toISOString() }
          : session
      ))
    } catch (err) {
      console.error('Error updating last accessed:', err)
    }
  }, [])

  // Load more sessions (pagination)
  const loadMoreSessions = useCallback(async () => {
    const hasMore = filterLanguage 
      ? nextPageTokens[filterLanguage]
      : nextPageTokens[defaultLanguage]
    if (!hasMore || isLoadingMore) {
      return
    }
    await loadBackendSessions(false, true) // Append mode
  }, [nextPageTokens, isLoadingMore, loadBackendSessions, filterLanguage, defaultLanguage])

  // Refresh sessions (both local and backend)
  const refreshSessions = useCallback(async () => {
    // Reset pagination tokens on refresh
    setNextPageTokens(
      Object.fromEntries(
        LEARNING_LANGS.map(language => [language, undefined]),
      ) as Record<LearningLanguage, string | undefined>,
    )
    await loadBackendSessions(true, false)
  }, [loadBackendSessions])

  // Initial load
  useEffect(() => {
    let cancelled = false
    const initializeSessions = async () => {
      setIsLoading(true)
      await loadBackendSessions(false, false)
      if (!cancelled) setIsLoading(false)
    }

    initializeSessions()
    return () => { cancelled = true }
  }, [loadBackendSessions])

  // Calculate hasMore based on pagination tokens
  const hasMore = !!(
    filterLanguage 
      ? nextPageTokens[filterLanguage]
      : nextPageTokens[defaultLanguage]
  )

  return {
    sessions,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refreshSessions,
    loadMoreSessions,
    updateLastAccessed,
  }
}
