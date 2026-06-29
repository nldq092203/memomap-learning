"use client"

import { useEffect, useMemo, useState } from "react"
import { useIsAuthenticated } from "@/lib/hooks/use-auth"
import {
  learningProgressApi,
  type ExerciseProgressRecord,
  type ExerciseProgressSection,
} from "@/lib/services/learning-progress-api"

export function useExerciseProgressMap(section?: ExerciseProgressSection | null) {
  const isAuthenticated = useIsAuthenticated()
  const [items, setItems] = useState<ExerciseProgressRecord[]>([])

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      return
    }

    let cancelled = false
    void learningProgressApi
      .listProgress({
        section: section || undefined,
        limit: 100,
        offset: 0,
      })
      .then((response) => {
        if (!cancelled) {
          setItems(response.items)
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug("Progress list unavailable", error)
        }
        if (!cancelled) {
          setItems([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, section])

  return useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.exercise_id,
          {
            status: item.status,
            score: item.score,
            accuracy: item.accuracy,
          },
        ]),
      ),
    [items],
  )
}

