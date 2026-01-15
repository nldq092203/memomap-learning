"use client"

import { useState, useCallback, useMemo } from "react"
import { learningCoCeApi } from "@/lib/services/learning-coce-api"
import type {
  CEFRLevel,
  CoCeExercise,
  CoCeTranscript,
  CoCeQuestions,
  CoCeQuestion,
  ExerciseTopic,
} from "@/lib/types/api/coce"
import { notificationService } from "@/lib/services/notification-service"

type PracticeMode = "audio" | "transcript" | "co" | "ce"

interface UserAnswer {
  questionId: string
  selectedIndices: number[]
}

export function useCoCePractice() {
  const [level, setLevel] = useState<CEFRLevel>("B2")
  const [topic, setTopic] = useState<ExerciseTopic | null>(null)
  const [exercises, setExercises] = useState<CoCeExercise[]>([])
  const [currentExercise, setCurrentExercise] = useState<CoCeExercise | null>(null)
  const [transcript, setTranscript] = useState<CoCeTranscript | null>(null)
  const [questions, setQuestions] = useState<CoCeQuestions | null>(null)
  const [mode, setMode] = useState<PracticeMode>("audio")
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Load exercises for selected level
  const loadExercises = useCallback(async (selectedLevel: CEFRLevel, selectedTopic?: ExerciseTopic | null) => {
    setLoading(true)
    try {
      const data = await learningCoCeApi.listExercises(selectedLevel, selectedTopic || undefined)
      setExercises(data)
      setLevel(selectedLevel)
      if (selectedTopic !== undefined) setTopic(selectedTopic)
    } catch (error) {
      console.error("Failed to load exercises:", error)
      notificationService.error("Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load exercise details
  const loadExercise = useCallback(
    async (exerciseId: string) => {
      setLoading(true)
      try {
        const data = await learningCoCeApi.getExercise(exerciseId)
        setCurrentExercise(data)
        setMode("audio")
        setTranscript(null)
        setQuestions(null)
        setUserAnswers([])
        setShowResults(false)
      } catch (error) {
        console.error("Failed to load exercise:", error)
        notificationService.error("Failed to load exercise")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Load transcript
  const loadTranscript = useCallback(async () => {
    if (!currentExercise) return
    setLoading(true)
    try {
      const data = await learningCoCeApi.getTranscript(currentExercise.id)
      setTranscript(data)
      setMode("transcript")
    } catch (error) {
      console.error("Failed to load transcript:", error)
      notificationService.error("Failed to load transcript")
    } finally {
      setLoading(false)
    }
  }, [currentExercise])

  // Load questions (CO or CE)
  const loadQuestions = useCallback(
    async (type: "co" | "ce") => {
      if (!currentExercise) return
      setLoading(true)
      try {
        const data = await learningCoCeApi.getQuestions(currentExercise.id, type)
        setQuestions(data)
        setMode(type)
        setUserAnswers([])
        setShowResults(false)
      } catch (error) {
        console.error("Failed to load questions:", error)
        notificationService.error("Failed to load questions")
      } finally {
        setLoading(false)
      }
    },
    [currentExercise]
  )

  // Update user answer for a question
  const updateAnswer = useCallback((questionId: string, selectedIndices: number[]) => {
    setUserAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) =>
          a.questionId === questionId ? { ...a, selectedIndices } : a
        )
      }
      return [...prev, { questionId, selectedIndices }]
    })
  }, [])

  // Submit answers and show results
  const submitAnswers = useCallback(() => {
    if (!questions) return

    // Validate all questions answered
    const allAnswered = questions.questions.every((q) =>
      userAnswers.some((a) => a.questionId === q.id && a.selectedIndices.length > 0)
    )

    if (!allAnswered) {
      notificationService.error("Please answer all questions before submitting")
      return
    }

    setShowResults(true)
  }, [questions, userAnswers])

  // Calculate score
  const score = useMemo(() => {
    if (!questions || !showResults) return null

    let correct = 0
    questions.questions.forEach((q) => {
      const userAnswer = userAnswers.find((a) => a.questionId === q.id)
      if (!userAnswer) return

      const isCorrect =
        userAnswer.selectedIndices.length === q.correct_indices.length &&
        userAnswer.selectedIndices.every((idx) => q.correct_indices.includes(idx))

      if (isCorrect) correct++
    })

    return {
      correct,
      total: questions.questions.length,
      percentage: Math.round((correct / questions.questions.length) * 100),
    }
  }, [questions, userAnswers, showResults])

  // Check if a specific answer is correct
  const isAnswerCorrect = useCallback(
    (questionId: string): boolean | null => {
      if (!showResults || !questions) return null

      const question = questions.questions.find((q) => q.id === questionId)
      const userAnswer = userAnswers.find((a) => a.questionId === questionId)

      if (!question || !userAnswer) return null

      return (
        userAnswer.selectedIndices.length === question.correct_indices.length &&
        userAnswer.selectedIndices.every((idx) => question.correct_indices.includes(idx))
      )
    },
    [questions, userAnswers, showResults]
  )

  // Reset practice
  const reset = useCallback(() => {
    setCurrentExercise(null)
    setTranscript(null)
    setQuestions(null)
    setUserAnswers([])
    setShowResults(false)
    setMode("audio")
  }, [])

  // Back to exercise list
  const backToList = useCallback(() => {
    reset()
  }, [reset])

  // Back to level selection
  const backToLevelSelection = useCallback(() => {
    setExercises([])
    reset()
    setTopic(null)
  }, [reset])

  return {
    // State
    level,
    topic,
    exercises,
    currentExercise,
    transcript,
    questions,
    mode,
    userAnswers,
    loading,
    showResults,
    score,

    // Actions
    loadExercises,
    loadExercise,
    loadTranscript,
    loadQuestions,
    updateAnswer,
    submitAnswers,
    isAnswerCorrect,
    reset,
    backToList,
    backToLevelSelection,
    setMode,
    setTopic,
  }
}
