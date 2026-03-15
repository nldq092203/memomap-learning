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

function playSessionBell() {
  if (typeof window === "undefined") return
  try {
    if (!bellAudio) {
      bellAudio = new Audio("/sounds/learning-session-bell.mp3")
      bellAudio.volume = 0.8
    }
    bellAudio.currentTime = 0
    void bellAudio.play().catch(() => {})
  } catch {
    // ignore
  }
}

function formatDefaultName(): string {
  const now = new Date()
  const datePart = now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  return `Session (${datePart})`
}

const defaultState: TimeSessionState = {
  isActive: false,
  isPaused: false,
  name: "",
  startedAtMs: null,
  elapsedSeconds: 0,
  plannedSeconds: null,
}

export function LearningTimeSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { lang } = useLearningLang()

  const [state, setState] = useState<TimeSessionState>(() => {
    if (typeof window === "undefined") return defaultState
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaultState
      const parsed = JSON.parse(raw) as Partial<TimeSessionState> | null
      if (!parsed || !parsed.isActive) return defaultState

      const now = Date.now()
      const baseElapsed = parsed.elapsedSeconds ?? 0

      // If paused, don't add extra time
      if (parsed.isPaused) {
        return {
          isActive: true,
          isPaused: true,
          name: parsed.name || formatDefaultName(),
          startedAtMs: null,
          elapsedSeconds: baseElapsed,
          plannedSeconds:
            typeof parsed.plannedSeconds === "number" && parsed.plannedSeconds > 0
              ? parsed.plannedSeconds
              : null,
        }
      }

      // If running, calculate additional elapsed time since last save
      const additional = parsed.startedAtMs
        ? Math.max(0, Math.floor((now - parsed.startedAtMs) / 1000))
        : 0

      return {
        isActive: true,
        isPaused: false,
        name: parsed.name || formatDefaultName(),
        startedAtMs: now, // Reset start to now
        elapsedSeconds: baseElapsed + additional, // Accumulate
        plannedSeconds:
          typeof parsed.plannedSeconds === "number" && parsed.plannedSeconds > 0
            ? parsed.plannedSeconds
            : null,
      }
    } catch {
      return defaultState
    }
  })

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Use a ref to track accumulated elapsed seconds to avoid stale closure issues
  const elapsedRef = useRef(state.elapsedSeconds)
  elapsedRef.current = state.elapsedSeconds
  const stateRef = useRef(state)
  stateRef.current = state
  const autoPausedRef = useRef(false)

  // Persist state in localStorage (not on every second tick)
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
      // ignore
    }
  }, [state.isActive, state.isPaused, state.name, state.startedAtMs, state.plannedSeconds, state.elapsedSeconds])

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

    const tickStartMs = state.startedAtMs
    // Capture the baseline elapsed at the moment the tick starts
    const baseElapsed = elapsedRef.current
    const plannedSeconds = state.plannedSeconds
    let hasWarnedPlanned = false
    let hasNotifiedPlanned = false

    tickRef.current = setInterval(() => {
      const now = Date.now()
      const additional = Math.max(0, Math.floor((now - tickStartMs) / 1000))
      const nextElapsed = baseElapsed + additional

      setState(prev => ({
        ...prev,
        elapsedSeconds:
          typeof plannedSeconds === "number" && plannedSeconds > 0
            ? Math.min(nextElapsed, plannedSeconds)
            : nextElapsed,
      }))

      if (typeof plannedSeconds === "number" && plannedSeconds > 0) {
        const remaining = plannedSeconds - nextElapsed

        if (!hasWarnedPlanned && remaining <= 15 && remaining > 0) {
          hasWarnedPlanned = true
          notificationService.info("Encore 15 secondes ⏰")
          playSessionBell()
        }

        if (!hasNotifiedPlanned && nextElapsed >= plannedSeconds) {
          hasNotifiedPlanned = true
          notificationService.info("Durée prévue atteinte ⏰")
          playSessionBell()
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
  }, [state.isActive, state.isPaused, state.startedAtMs, state.plannedSeconds])

  const startSession = useCallback(
    (name?: string, plannedSeconds?: number | null) => {
      if (state.isActive) return
      const now = Date.now()
      setState({
        isActive: true,
        isPaused: false,
        name: name && name.trim().length > 0 ? name : formatDefaultName(),
        startedAtMs: now,
        elapsedSeconds: 0,
        plannedSeconds:
          typeof plannedSeconds === "number" && plannedSeconds > 0
            ? plannedSeconds
            : null,
      })
    },
    [state.isActive],
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
    autoPausedRef.current = false
    const now = Date.now()
    setState(prev => ({
      ...prev,
      isPaused: false,
      startedAtMs: now,
    }))
  }, [state.isActive, state.isPaused])

  // Auto-pause when the tab/window is inactive and resume when it becomes active again.
  // Resume only if the pause was triggered automatically, not manually by the user.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    const autoPause = () => {
      const current = stateRef.current
      if (!current.isActive || current.isPaused || !current.startedAtMs) return

      const now = Date.now()
      const additional = Math.max(
        0,
        Math.floor((now - current.startedAtMs) / 1000),
      )

      autoPausedRef.current = true
      setState(prev => ({
        ...prev,
        isPaused: true,
        startedAtMs: null,
        elapsedSeconds: prev.elapsedSeconds + additional,
      }))
    }

    const autoResume = () => {
      const current = stateRef.current
      if (
        !autoPausedRef.current ||
        !current.isActive ||
        !current.isPaused
      ) {
        return
      }

      autoPausedRef.current = false
      setState(prev => ({
        ...prev,
        isPaused: false,
        startedAtMs: Date.now(),
      }))
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        autoPause()
      } else {
        autoResume()
      }
    }

    const handleWindowBlur = () => {
      autoPause()
    }

    const handleWindowFocus = () => {
      if (!document.hidden) {
        autoResume()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleWindowBlur)
    window.addEventListener("focus", handleWindowFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleWindowBlur)
      window.removeEventListener("focus", handleWindowFocus)
    }
  }, [])

  const stopSession = useCallback(async () => {
    if (!state.isActive) return

    const now = Date.now()
    const extra =
      state.startedAtMs && !state.isPaused
        ? Math.max(0, Math.floor((now - state.startedAtMs) / 1000))
        : 0
    const rawElapsed = state.elapsedSeconds + extra

    const elapsed =
      typeof state.plannedSeconds === "number" && state.plannedSeconds > 0
        ? Math.min(rawElapsed, state.plannedSeconds)
        : rawElapsed

    try {
      await learningApi.createTimeSession({
        language: lang as LearningLanguage,
        name: state.name || formatDefaultName(),
        duration_seconds: elapsed,
      })
      notificationService.success("Session enregistrée ✨")
    } catch (error) {
      console.error("Failed to save learning session", error)
      notificationService.error("Échec de l'enregistrement de la session")
    } finally {
      setState(defaultState)
    }
  }, [lang, state.isActive, state.startedAtMs, state.elapsedSeconds, state.name, state.isPaused, state.plannedSeconds])

  const cancelSession = useCallback(() => {
    if (!state.isActive) return
    autoPausedRef.current = false
    setState(defaultState)
    notificationService.info("Session annulée")
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
