"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { learningApi, type LearningLanguage } from "@/lib/services/learning-api"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { notificationService } from "@/lib/services/notification-service"

type TimeSessionState = {
  isActive: boolean
  isPaused: boolean
  name: string
  startedAtMs: number | null
  elapsedSeconds: number
  plannedSeconds: number | null
}

type LearningTimeSessionContextValue = TimeSessionState & {
  startSession: (name?: string, plannedSeconds?: number | null) => void
  pauseSession: () => void
  resumeSession: () => void
  stopSession: () => Promise<void>
  cancelSession: () => void
}

const STORAGE_KEY = "learning_time_session_state"

const LearningTimeSessionContext =
  createContext<LearningTimeSessionContextValue | null>(null)

let bellAudio: HTMLAudioElement | null = null

/**
 * Play a short alert sound when a planned session is about to finish
 * or has completed. The audio file should be placed at:
 *   public/sounds/learning-session-bell.mp3
 * with a duration of ~7 seconds (any CC0/open-source sound).
 */
function playSessionBell() {
  if (typeof window === "undefined") return

  try {
    if (!bellAudio) {
      bellAudio = new Audio("/sounds/learning-session-bell.mp3")
      bellAudio.volume = 0.8
    }
    bellAudio.currentTime = 0
    void bellAudio.play().catch(() => {
    })
  } catch {
    // ignore
  }
}

function formatDefaultName(language: LearningLanguage): string {
  const now = new Date()
  const datePart = now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  return `Learning session (${language.toUpperCase()} · ${datePart})`
}

export function LearningTimeSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { lang } = useLearningLang()
  const [state, setState] = useState<TimeSessionState>(() => {
    if (typeof window === "undefined") {
      return {
        isActive: false,
        isPaused: false,
        name: "",
        startedAtMs: null,
        elapsedSeconds: 0,
        plannedSeconds: null,
      }
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return {
          isActive: false,
          isPaused: false,
          name: "",
          startedAtMs: null,
          elapsedSeconds: 0,
          plannedSeconds: null,
        }
      }
      const parsed = JSON.parse(raw) as Partial<TimeSessionState> | null
      if (!parsed || !parsed.startedAtMs || !parsed.isActive) {
        return {
          isActive: false,
          isPaused: false,
          name: "",
          startedAtMs: null,
          elapsedSeconds: 0,
          plannedSeconds: null,
        }
      }
      const now = Date.now()
      const baseElapsed = parsed.elapsedSeconds ?? 0
      const additional = Math.max(0, Math.floor((now - parsed.startedAtMs) / 1000))
      return {
        isActive: true,
        isPaused: parsed.isPaused ?? false,
        name: parsed.name || formatDefaultName(lang),
        startedAtMs: parsed.startedAtMs,
        elapsedSeconds: baseElapsed + additional,
        plannedSeconds:
          typeof parsed.plannedSeconds === "number" && parsed.plannedSeconds > 0
            ? parsed.plannedSeconds
            : null,
      }
    } catch {
      return {
        isActive: false,
        isPaused: false,
        name: "",
        startedAtMs: null,
        elapsedSeconds: 0,
        plannedSeconds: null,
      }
    }
  })

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist state in localStorage so reloads keep the active timer.
  // Optimized to not update on every elapsedSeconds change (which happens every second)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (!state.isActive) {
        window.localStorage.removeItem(STORAGE_KEY)
        return
      }
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isActive: state.isActive,
          isPaused: state.isPaused,
          name: state.name,
          startedAtMs: state.startedAtMs,
          elapsedSeconds: state.elapsedSeconds,
          plannedSeconds: state.plannedSeconds,
        }),
      )
    } catch {
      // ignore errors
    }
  }, [state.isActive, state.isPaused, state.name, state.startedAtMs, state.plannedSeconds])
  // Note: elapsedSeconds intentionally excluded to avoid updates every second

  // 1s ticker while active and not paused
  useEffect(() => {
    if (!state.isActive || state.isPaused || !state.startedAtMs) {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }

    if (tickRef.current) {
      clearInterval(tickRef.current)
    }

    const startSnapshot = state.startedAtMs
    const baseElapsed = state.elapsedSeconds
    const plannedSeconds = state.plannedSeconds
    let hasWarnedPlanned = false
    let hasNotifiedPlanned = false

    tickRef.current = setInterval(() => {
      const now = Date.now()
      const additional = Math.max(0, Math.floor((now - startSnapshot) / 1000))
      const nextElapsed = baseElapsed + additional

      setState(prev => ({
        ...prev,
        // For planned sessions, clamp the elapsed time so the
        // countdown stops at 0 instead of running into negatives.
        elapsedSeconds:
          typeof plannedSeconds === "number" && plannedSeconds > 0
            ? Math.min(nextElapsed, plannedSeconds)
            : nextElapsed,
      }))

      if (typeof plannedSeconds === "number" && plannedSeconds > 0) {
        const remaining = plannedSeconds - nextElapsed

        if (!hasWarnedPlanned && remaining <= 15 && remaining > 0) {
          hasWarnedPlanned = true
          notificationService.info("15 seconds left in this session ⏰")
          playSessionBell()
        }

        if (!hasNotifiedPlanned && nextElapsed >= plannedSeconds) {
          hasNotifiedPlanned = true
          notificationService.info("Planned session duration reached ⏰")
          playSessionBell()

          // Stop ticking once the planned duration has been reached.
          if (tickRef.current) {
            clearInterval(tickRef.current)
            tickRef.current = null
          }
        }
      }
    }, 1000)

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [state.isActive, state.isPaused, state.startedAtMs])

  const startSession = useCallback(
    (name?: string, plannedSeconds?: number | null) => {
      if (state.isActive) return
      const now = Date.now()
      setState({
        isActive: true,
        isPaused: false,
        name: name && name.trim().length > 0 ? name : formatDefaultName(lang),
        startedAtMs: now,
        elapsedSeconds: 0,
        plannedSeconds:
          typeof plannedSeconds === "number" && plannedSeconds > 0
            ? plannedSeconds
            : null,
      })
    },
    [lang, state.isActive],
  )

  const pauseSession = useCallback(() => {
    if (!state.isActive || state.isPaused || !state.startedAtMs) return

    const now = Date.now()
    const additional = Math.max(0, Math.floor((now - state.startedAtMs) / 1000))

    setState(prev => ({
      ...prev,
      isPaused: true,
      startedAtMs: null,
      elapsedSeconds: prev.elapsedSeconds + additional,
    }))
  }, [state.isActive, state.isPaused, state.startedAtMs])

  const resumeSession = useCallback(() => {
    if (!state.isActive || !state.isPaused) return
    const now = Date.now()
    setState(prev => ({
      ...prev,
      isPaused: false,
      startedAtMs: now,
    }))
  }, [state.isActive, state.isPaused])

  const stopSession = useCallback(async () => {
    if (!state.isActive) return

    const now = Date.now()
    const extra =
      state.startedAtMs && !state.isPaused
        ? Math.max(0, Math.floor((now - state.startedAtMs) / 1000))
        : 0
    const rawElapsed = state.elapsedSeconds + extra

    // For planned sessions, clamp duration to plannedSeconds so
    // finishing late still records only the planned time.
    const elapsed =
      typeof state.plannedSeconds === "number" && state.plannedSeconds > 0
        ? Math.min(rawElapsed, state.plannedSeconds)
        : rawElapsed

    try {
      await learningApi.createTimeSession({
        language: lang as LearningLanguage,
        name: state.name || formatDefaultName(lang),
        duration_seconds: elapsed,
      })
      notificationService.success("Learning session saved to analytics ✨")
    } catch (error) {
      console.error("Failed to save learning session", error)
      notificationService.error("Failed to save learning session")
    } finally {
      setState({
        isActive: false,
        isPaused: false,
        name: "",
        startedAtMs: null,
        elapsedSeconds: 0,
        plannedSeconds: null,
      })
    }
  }, [lang, state.isActive, state.startedAtMs, state.elapsedSeconds, state.name])

  const cancelSession = useCallback(() => {
    if (!state.isActive) return
    setState({
      isActive: false,
      isPaused: false,
      name: "",
      startedAtMs: null,
      elapsedSeconds: 0,
      plannedSeconds: null,
    })
    notificationService.info("Learning session cancelled")
  }, [state.isActive])

  const value = useMemo<LearningTimeSessionContextValue>(
    () => ({
      ...state,
      startSession,
      pauseSession,
      resumeSession,
      stopSession,
      cancelSession,
    }),
    [state, startSession, pauseSession, resumeSession, stopSession, cancelSession],
  )

  return (
    <LearningTimeSessionContext.Provider value={value}>
      {children}
    </LearningTimeSessionContext.Provider>
  )
}

export function useLearningTimeSession(): LearningTimeSessionContextValue {
  const ctx = useContext(LearningTimeSessionContext)
  if (!ctx) {
    throw new Error(
      "useLearningTimeSession must be used within LearningTimeSessionProvider",
    )
  }
  return ctx
}
