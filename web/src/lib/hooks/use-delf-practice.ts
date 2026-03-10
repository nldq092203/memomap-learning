"use client"

import { useState, useCallback, useMemo } from "react"
import { learningDelfApi } from "@/lib/services/learning-delf-api"
import type {
  DelfLevel,
  DelfSection,
  DelfTestPaperResponse,
  DelfTestPaperDetailResponse,
  MatchingAnswer,
} from "@/lib/types/api/delf"
import { notificationService } from "@/lib/services/notification-service"

type PracticeMode = "intro" | "test" | "review"

// For MCQ exercises
interface UserAnswer {
  exerciseId: string
  selectedOption: number
}

export function useDelfPractice() {
  const [level, setLevel] = useState<DelfLevel | null>(null)
  const [section, setSection] = useState<DelfSection | null>(null)
  const [variant, setVariant] = useState<string>("tout-public")

  const [tests, setTests] = useState<DelfTestPaperResponse[]>([])
  const [currentTest, setCurrentTest] = useState<DelfTestPaperDetailResponse | null>(null)
  
  const [mode, setMode] = useState<PracticeMode>("intro")
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [matchingAnswers, setMatchingAnswers] = useState<MatchingAnswer[]>([])
  const [subQuestionAnswers, setSubQuestionAnswers] = useState<Record<string, any>>({}) // Stores nested answers
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Load test papers list
  const loadTests = useCallback(
    async (selectedLevel: DelfLevel, selectedSection?: DelfSection | null) => {
      setLoading(true)
      
      const derivedVariant = `tout-public-${selectedLevel.toLowerCase()}`
      
      try {
        const data = await learningDelfApi.listTests(
          selectedLevel,
          selectedSection || undefined,
          derivedVariant
        )
        setTests(data)
        setLevel(selectedLevel)
        if (selectedSection) setSection(selectedSection)
        setVariant(derivedVariant)
      } catch (error) {
        console.error("Failed to load DELF tests:", error)
        notificationService.error("Failed to load DELF tests")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Load a specific test paper
  const loadTest = useCallback(
    async (testId: string, testLevel: DelfLevel, testVariant: string, testSection: string) => {
      setLoading(true)
      try {
        const data = await learningDelfApi.getTest(testId, testLevel, testVariant, testSection)
        setCurrentTest(data)
        setMode("intro")
        setUserAnswers([])
        setMatchingAnswers([])
        setSubQuestionAnswers({})
        setShowResults(false)
      } catch (error) {
        console.error("Failed to load test paper:", error)
        notificationService.error("Failed to load test paper")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Update user answer for MCQ exercise
  const updateAnswer = useCallback((exerciseId: string, selectedOption: number) => {
    setUserAnswers((prev) => {
      const existing = prev.find((a) => a.exerciseId === exerciseId)
      if (existing) {
        return prev.map((a) =>
          a.exerciseId === exerciseId ? { ...a, selectedOption } : a
        )
      }
      return [...prev, { exerciseId, selectedOption }]
    })
  }, [])

  // Update matching answer for a document → person association
  const updateMatchingAnswer = useCallback((exerciseId: string, docId: string, personLabel: string) => {
    setMatchingAnswers((prev) => {
      const existing = prev.find((a) => a.exerciseId === exerciseId)
      if (existing) {
        return prev.map((a) =>
          a.exerciseId === exerciseId
            ? { ...a, selections: { ...a.selections, [docId]: personLabel } }
            : a
        )
      }
      return [...prev, { exerciseId, selections: { [docId]: personLabel } }]
    })
  }, [])

  // Update answer for nested sub-questions
  const updateSubQuestionAnswer = useCallback((questionId: string, value: any) => {
    setSubQuestionAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }, [])

  // Submit test and show results
  const submitTest = useCallback(() => {
    if (!currentTest?.content.exercises) return
    setShowResults(true)
    setMode("review")
  }, [currentTest])

  // Calculate score
  const score = useMemo(() => {
    if (!currentTest?.content.exercises || !showResults) return null

    let correct = 0
    let total = 0

    currentTest.content.exercises.forEach((ex) => {
      if (ex.type === "matching") {
        // Matching: count each document-person pair
        if (ex.correct_answers && ex.documents) {
          const matchAnswer = matchingAnswers.find((a) => a.exerciseId === ex.id)
          ex.documents.forEach((doc) => {
            const pts = ex.points || 1 // fallback if needed
            total += pts
            const correctPerson = ex.correct_answers![doc.id]
            if (matchAnswer?.selections[doc.id] === correctPerson) {
              correct += pts
            }
          })
        }
      } else if (ex.type === "document_comprehension" || ex.type === "article_comprehension" || ex.type === "multi_document_comprehension" || ex.type === "multiple_choice_set") {
        // Nested sub-questions
        ex.questions?.forEach(q => {
          if (q.type === "single_choice" || q.type === "multiple_choice" || q.type === "multiple_choice_image" || q.type === "true_false") {
            const pts = q.points || 1
            total += pts
            const ans = subQuestionAnswers[q.id]
            if (ans !== undefined && ans === q.correct_answer) correct += pts
          } else if (q.type === "multiple_select_image") {
            // Checkbox question: count total correct options
            const correctArr = q.correct_answers as string[]
            if (correctArr) {
              const maxPts = q.points || correctArr.length
              total += maxPts
              const ansArr = subQuestionAnswers[q.id] as string[] || []
              let rawCorrect = 0
              ansArr.forEach(val => {
                if (correctArr.includes(val)) rawCorrect++
              })
              const wrongSelections = ansArr.filter(val => !correctArr.includes(val)).length
              const netCorrect = Math.max(0, rawCorrect - wrongSelections)
              // Award proportional points
              correct += (netCorrect / correctArr.length) * maxPts
            }
          } else if (q.type === "label_matching") {
            // Label matching (A->1, B->3)
            const correctMap = q.correct_answers as Record<string, number>
            if (correctMap) {
              const keys = Object.keys(correctMap)
              const maxPts = q.points || keys.length
              total += maxPts
              const ansMap = subQuestionAnswers[q.id] as Record<string, number> || {}
              let rawCorrect = 0
              keys.forEach(k => {
                if (ansMap[k] === correctMap[k]) rawCorrect++
              })
              correct += (rawCorrect / keys.length) * maxPts
            }
          }
        })
      } else {
        // MCQ (flat legacy format)
        const pts = ex.points || 1
        total += pts
        const userAnswer = userAnswers.find((a) => a.exerciseId === ex.id)
        if (userAnswer && userAnswer.selectedOption === ex.correct_answer) {
          correct += pts
        }
      }
    })

    return {
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }, [currentTest, userAnswers, matchingAnswers, showResults])

  // Check if a specific MCQ answer is correct
  const isAnswerCorrect = useCallback(
    (exerciseId: string): boolean | null => {
      if (!showResults || !currentTest?.content.exercises) return null

      const exercise = currentTest.content.exercises.find((ex) => ex.id === exerciseId)
      const userAnswer = userAnswers.find((a) => a.exerciseId === exerciseId)

      if (!exercise || !userAnswer) return null

      return userAnswer.selectedOption === exercise.correct_answer
    },
    [currentTest, userAnswers, showResults]
  )

  // Reset current test state
  const resetTest = useCallback(() => {
    setCurrentTest(null)
    setUserAnswers([])
    setMatchingAnswers([])
    setSubQuestionAnswers({})
    setShowResults(false)
    setMode("intro")
  }, [])

  // Complete reset to selection screen
  const resetAll = useCallback(() => {
    setTests([])
    resetTest()
    setLevel(null)
    setSection(null)
  }, [resetTest])

  return {
    // State
    level,
    section,
    variant,
    tests,
    currentTest,
    mode,
    userAnswers,
    matchingAnswers,
    subQuestionAnswers,
    loading,
    showResults,
    score,

    // Actions
    loadTests,
    loadTest,
    updateAnswer,
    updateMatchingAnswer,
    updateSubQuestionAnswer,
    submitTest,
    isAnswerCorrect,
    setMode,
    resetTest,
    resetAll,
  }
}
