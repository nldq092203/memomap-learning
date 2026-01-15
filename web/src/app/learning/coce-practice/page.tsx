"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LearningNav } from "@/components/learning/layout/learning-nav"
import { useCoCePractice } from "@/lib/hooks/use-coce-practice"
import type { CEFRLevel } from "@/lib/types/api/coce"
import {
  LevelSelection,
  ExerciseList,
  MediaPlayer,
  TranscriptView,
  PracticeTypeSelector,
  QuestionsView,
  LEVEL_INFO,
} from "@/components/learning/coce"
import { Headphones, Volume2, ChevronLeft } from "lucide-react"

export default function CoCePracticePage() {
  const {
    level,
    exercises,
    currentExercise,
    transcript,
    questions,
    userAnswers,
    loading,
    showResults,
    score,
    loadExercises,
    loadExercise,
    loadTranscript,
    loadQuestions,
    updateAnswer,
    submitAnswers,
    isAnswerCorrect,
    backToList,
    backToLevelSelection,
  } = useCoCePractice()

  const [showTranscript, setShowTranscript] = useState(false)
  const [activeQuestionType, setActiveQuestionType] = useState<"co" | "ce" | null>(null)

  // Handle level selection
  const handleLevelSelect = (selectedLevel: CEFRLevel) => {
    void loadExercises(selectedLevel)
  }

  // Handle exercise selection
  const handleExerciseSelect = (exerciseId: string) => {
    void loadExercise(exerciseId)
    setShowTranscript(false)
  }

  // Handle transcript toggle
  const handleTranscriptToggle = () => {
    if (!transcript && !loading) {
      void loadTranscript()
    }
    setShowTranscript(!showTranscript)
  }

  // Handle question type change
  const handleQuestionTypeChange = (type: "co" | "ce") => {
    setActiveQuestionType(type)
    if (!questions || questions.meta.type !== (type === "co" ? "compréhension_orale" : "compréhension_écrite")) {
      void loadQuestions(type)
    }
  }

  // Handle answer change
  const handleAnswerChange = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    const currentAnswer = userAnswers.find((a) => a.questionId === questionId)
    if (isMultiple) {
      const current = currentAnswer?.selectedIndices || []
      const newIndices = current.includes(optionIndex)
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex]
      updateAnswer(questionId, newIndices)
    } else {
      updateAnswer(questionId, [optionIndex])
    }
  }

  // Render level selection screen
  if (exercises.length === 0 && !currentExercise) {
    return (
      <div className="min-h-screen bg-background">
        <LearningNav
          breadcrumbs={[
            { label: "Learning", href: "/learning" },
            { label: "CO/CE Practice" },
          ]}
          showBackButton
        />
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <LevelSelection onSelectLevel={handleLevelSelect} />
        </div>
      </div>
    )
  }

  // Render exercise list
  if (exercises.length > 0 && !currentExercise) {
    return (
      <div className="min-h-screen bg-background">
        <LearningNav
          breadcrumbs={[
            { label: "Learning", href: "/learning" },
            { label: "CO/CE Practice", href: "/learning/coce-practice" },
            { label: LEVEL_INFO[level].name },
          ]}
          showBackButton
        />
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <ExerciseList
            level={level}
            exercises={exercises}
            loading={loading}
            onSelectExercise={handleExerciseSelect}
            onBackToLevelSelection={backToLevelSelection}
          />
        </div>
      </div>
    )
  }

  // Render exercise detail with hybrid layout
  if (currentExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <LearningNav
          breadcrumbs={[
            { label: "Learning", href: "/learning" },
            { label: "CO/CE Practice", href: "/learning/coce-practice" },
            { label: LEVEL_INFO[level].name },
            { label: currentExercise.name },
          ]}
          showBackButton
        />

        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          {/* Header with gradient */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 backdrop-blur-sm border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
                    <Headphones className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold md:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {currentExercise.name}
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4" />
                    <span>
                      {Math.floor(currentExercise.duration_seconds / 60)}:
                      {String(currentExercise.duration_seconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <span>•</span>
                  <Badge variant="secondary" className="font-normal">
                    {LEVEL_INFO[level].name}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" onClick={backToList} className="gap-2 hover:bg-primary/10">
                <ChevronLeft className="h-4 w-4" />
                Back to List
              </Button>
            </div>
          </div>

          {/* Media Player (Audio or Video) */}
          <MediaPlayer
            exercise={currentExercise}
            showTranscript={showTranscript}
            onTranscriptToggle={handleTranscriptToggle}
            isLoadingTranscript={loading && !transcript}
          />

          {/* Transcript */}
          {showTranscript && (
            <TranscriptView transcript={transcript} loading={loading} />
          )}

          {/* Practice Type Selector */}
          <PracticeTypeSelector
            activeType={activeQuestionType}
            onSelectType={handleQuestionTypeChange}
          />

          {/* Questions */}
          <QuestionsView
            questions={questions}
            activeType={activeQuestionType}
            loading={loading}
            showResults={showResults}
            score={score}
            userAnswers={userAnswers}
            isAnswerCorrect={isAnswerCorrect}
            onAnswerChange={handleAnswerChange}
            onSubmit={submitAnswers}
            onTryAgain={() => void loadQuestions(activeQuestionType)}
          />
        </div>
      </div>
    )
  }

  return null
}
