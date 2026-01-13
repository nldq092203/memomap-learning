"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  learningNumbersApi,
  type NumbersAnswerError,
  type NumbersType,
} from "@/lib/services/learning-numbers-api"
import { notificationService } from "@/lib/services/notification-service"

type ExerciseState = {
  id: string
  numberType: NumbersType
  audioRef: string
  blueprintId: string
  answer: string
  isCorrect: boolean | null
  errors: NumbersAnswerError[]
}

type SessionState = {
  sessionId: string
  totalExercises: number
  completed: number
}

export function useNumbersDictation() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [current, setCurrent] = useState<ExerciseState | null>(null)
  const [history, setHistory] = useState<ExerciseState[]>([])
  const [pending, setPending] = useState(false)
  const [summary, setSummary] = useState<{
    score: number
    correct: number
    incorrect: number
    perType: Record<NumbersType, { total: number; correct: number; incorrect: number }>
  } | null>(null)

  const hasActiveSession = !!session && !summary

  const loadNext = useCallback(
    async (sessionId: string) => {
      setPending(true)
      try {
        const res = await learningNumbersApi.getNextExercise(sessionId)
        // Backend now returns a flat payload:
        // { exercise_id, number_type, audio_ref, audio_url, ... }
        if (!res || (!("exercise_id" in res) && !("exerciseId" in res))) {
          setCurrent(null)
          return
        }

        const exercise: any = res
        const id = exercise.exercise_id ?? exercise.exerciseId
        const numberType = (exercise.number_type ?? exercise.numberType) as NumbersType
        const audioRef = (exercise.audio_url ?? exercise.audio_ref ?? exercise.audioRef) as string
        const blueprintId = (exercise.blueprint_id ?? exercise.blueprintId ?? "") as string

        if (!id || !numberType || !audioRef) {
          setCurrent(null)
          return
        }

        setCurrent({
          id,
          numberType,
          audioRef,
          blueprintId,
          answer: "",
          isCorrect: null,
          errors: [],
        })
      } catch (e) {
        console.error("Failed to load next Numbers exercise", e)
        notificationService.error("Unable to load next exercise")
      } finally {
        setPending(false)
      }
    },
    [],
  )

  const startSession = useCallback(
    async (types: NumbersType[], count: number) => {
      if (!types.length) {
        notificationService.error("Select at least one number type")
        return
      }
      setPending(true)
      setSummary(null)
      setHistory([])
      try {
        const res = await learningNumbersApi.createSession({ types, count })
        const totalExercises = res.total_exercises ?? res.count ?? count
        const state: SessionState = {
          sessionId: res.session_id,
          totalExercises,
          completed: 0,
        }
        setSession(state)
        await loadNext(res.session_id)
      } catch (e) {
        console.error("Failed to start Numbers session", e)
        notificationService.error("Unable to start Numbers Dictation session")
      } finally {
        setPending(false)
      }
    },
    [loadNext],
  )

  const updateAnswer = useCallback((value: string) => {
    setCurrent(prev =>
      prev ? { ...prev, answer: value.replace(/\s+/g, "") } : prev,
    )
  }, [])

  const submitAnswer = useCallback(async () => {
    if (!session || !current) return
    if (!current.answer.trim()) {
      notificationService.error("Type your answer before submitting")
      return
    }
    setPending(true)
    try {
      const res = await learningNumbersApi.submitAnswer(session.sessionId, {
        exercise_id: current.id,
        answer: current.answer,
      })
      const isCorrect = (res.is_correct ?? (res as any).isCorrect) as boolean

      const evaluated: ExerciseState = {
        ...current,
        isCorrect,
        errors: res.errors,
      }

      setHistory(prev => [...prev, evaluated])
      setSession(prev =>
        prev
          ? {
              ...prev,
              completed: prev.completed + 1,
            }
          : prev,
      )

      await loadNext(session.sessionId)
    } catch (e) {
      console.error("Failed to submit Numbers answer", e)
      notificationService.error("Unable to submit answer")
    } finally {
      setPending(false)
    }
  }, [session, current, loadNext])

  const finishSession = useCallback(async () => {
    if (!session) return
    setPending(true)
    try {
      const res = await learningNumbersApi.getSummary(session.sessionId)

      const byType: Record<
        NumbersType,
        { total: number; correct: number; incorrect: number }
      > = {} as any
      for (const s of res.per_type) {
        byType[s.number_type] = {
          total: s.total,
          correct: s.correct,
          incorrect: s.incorrect,
        }
      }

      setSummary({
        score: res.score,
        correct: res.correct,
        incorrect: res.incorrect,
        perType: byType,
      })
    } catch (e) {
      console.error("Failed to load Numbers summary", e)
      notificationService.error("Unable to load session summary")
    } finally {
      setPending(false)
    }
  }, [session])

  const resetSession = useCallback(() => {
    setSession(null)
    setCurrent(null)
    setHistory([])
    setSummary(null)
  }, [])

  const progress = useMemo(() => {
    if (!session) return 0
    if (!session.totalExercises) return 0
    return Math.round((session.completed / session.totalExercises) * 100)
  }, [session])

  return {
    // state
    session,
    current,
    history,
    summary,
    pending,
    progress,
    hasActiveSession,
    // actions
    startSession,
    updateAnswer,
    submitAnswer,
    finishSession,
    resetSession,
  }
}
