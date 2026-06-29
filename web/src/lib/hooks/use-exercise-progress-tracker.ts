"use client"

import { useCallback, useMemo, useRef } from "react"
import { useIsAuthenticated } from "@/lib/hooks/use-auth"
import {
  learningProgressApi,
  type ExerciseProgressPayload,
} from "@/lib/services/learning-progress-api"

type ProgressAction = "opened" | "started" | "completed" | "retried"

function dedupeKey(action: ProgressAction, exerciseId: string) {
  return `${action}:${exerciseId}`
}

export function useExerciseProgressTracker() {
  const isAuthenticated = useIsAuthenticated()
  const sentRef = useRef<Set<string>>(new Set())

  const send = useCallback(
    (
      action: ProgressAction,
      payload: ExerciseProgressPayload,
      options?: { dedupe?: boolean },
    ) => {
      if (!isAuthenticated || !payload.exercise_id) return

      const shouldDedupe =
        options?.dedupe ?? (action === "opened" || action === "started")
      const key = dedupeKey(action, payload.exercise_id)
      if (shouldDedupe && sentRef.current.has(key)) return
      if (shouldDedupe) sentRef.current.add(key)

      const request =
        action === "opened"
          ? learningProgressApi.markOpened(payload)
          : action === "started"
            ? learningProgressApi.markStarted(payload)
            : action === "completed"
              ? learningProgressApi.markCompleted(payload)
              : learningProgressApi.markRetried(payload)

      void request.catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug("Exercise progress update skipped", error)
        }
      })
    },
    [isAuthenticated],
  )

  const markOpened = useCallback(
    (payload: ExerciseProgressPayload) => send("opened", payload),
    [send],
  )

  const markStarted = useCallback(
    (payload: ExerciseProgressPayload) => send("started", payload),
    [send],
  )

  const markCompleted = useCallback(
    (payload: ExerciseProgressPayload) =>
      send("completed", payload, { dedupe: false }),
    [send],
  )

  const markRetried = useCallback(
    (payload: ExerciseProgressPayload) =>
      send("retried", payload, { dedupe: false }),
    [send],
  )

  return useMemo(
    () => ({
      markOpened,
      markStarted,
      markCompleted,
      markRetried,
    }),
    [markCompleted, markOpened, markRetried, markStarted],
  )
}
