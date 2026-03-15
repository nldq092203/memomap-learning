"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ListChecks, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCoCePractice } from "@/lib/hooks/use-coce-practice"
import type { CEFRLevel } from "@/lib/types/api/coce"
import { LevelSelection, LEVEL_INFO } from "@/components/learning/coce/level-selection"
import { ExerciseList } from "@/components/learning/coce/exercise-list"
import { MediaPlayer } from "@/components/learning/coce/media-player"
import { TranscriptView } from "@/components/learning/coce/transcript-view"
import { PracticeTypeSelector } from "@/components/learning/coce/practice-type-selector"
import { QuestionsView } from "@/components/learning/coce/questions-view"

function matchesQuestionMode(
  questionType: string | undefined,
  mode: "co" | "ce"
) {
  if (!questionType) return false

  const normalized = questionType.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return mode === "co"
    ? normalized === "comprehension_orale"
    : normalized === "comprehension_ecrite"
}

export default function CoCePracticePage() {
  const router = useRouter()
  const {
    level,
    topic,
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
  const [hasChosenLevel, setHasChosenLevel] = useState(false)
  const [isMediaPaneCollapsed, setIsMediaPaneCollapsed] = useState(false)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const handleLevelSelect = (selectedLevel: CEFRLevel) => {
    setHasChosenLevel(true)
    void loadExercises(selectedLevel)
  }

  const handleExerciseSelect = (exerciseId: string) => {
    void loadExercise(exerciseId)
    setShowTranscript(false)
    setActiveQuestionType(null)
    setActiveQuestionIndex(0)
    setIsMediaPaneCollapsed(false)
  }

  const handleTranscriptToggle = () => {
    if (!transcript && !loading) {
      void loadTranscript()
    }
    setShowTranscript((current) => !current)
  }

  const handleQuestionTypeChange = (type: "co" | "ce") => {
    setActiveQuestionType(type)
    setActiveQuestionIndex(0)

    if (!questions || !matchesQuestionMode(questions.meta.type, type)) {
      void loadQuestions(type)
    }
  }

  const handleAnswerChange = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    const currentAnswer = userAnswers.find((answer) => answer.questionId === questionId)

    if (isMultiple) {
      const currentIndices = currentAnswer?.selectedIndices || []
      const nextIndices = currentIndices.includes(optionIndex)
        ? currentIndices.filter((index) => index !== optionIndex)
        : [...currentIndices, optionIndex]

      updateAnswer(questionId, nextIndices)
      return
    }

    updateAnswer(questionId, [optionIndex])
  }

  const questionCount = questions?.questions.length ?? 0
  const answeredCount = useMemo(
    () =>
      questions?.questions.filter((question) =>
        userAnswers.some(
          (answer) => answer.questionId === question.id && answer.selectedIndices.length > 0
        )
      ).length ?? 0,
    [questions, userAnswers]
  )
  const progressPercentage = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0
  const currentProgress = showResults ? score?.percentage ?? 100 : progressPercentage

  useEffect(() => {
    if (!questions?.questions.length) {
      setActiveQuestionIndex(0)
      return
    }

    if (activeQuestionIndex > questions.questions.length - 1) {
      setActiveQuestionIndex(0)
    }
  }, [activeQuestionIndex, questions])

  const jumpToQuestion = (index: number) => {
    setActiveQuestionIndex(index)

    if (typeof document !== "undefined") {
      document.getElementById(`question-${index}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  if (exercises.length === 0 && !currentExercise) {
    if (hasChosenLevel && !loading) {
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
            <Button
              type="button"
              variant="ghost"
              className="mb-6 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => router.push("/learning/workspace")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour à l'espace d'entrainement
            </Button>

            <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {LEVEL_INFO[level].name}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Aucun exercice disponible
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Aucun contenu n'est actuellement visible pour ce niveau.
              </p>
              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setHasChosenLevel(false)
                    backToLevelSelection()
                  }}
                >
                  Choisir un autre niveau
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l'espace d'entrainement
          </Button>
          <LevelSelection onSelectLevel={handleLevelSelect} />
        </div>
      </div>
    )
  }

  if (exercises.length > 0 && !currentExercise) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l'espace d'entrainement
          </Button>
          <ExerciseList
            level={level}
            exercises={exercises}
            loading={loading}
            onSelectExercise={handleExerciseSelect}
            onBackToLevelSelection={() => {
              setHasChosenLevel(false)
              backToLevelSelection()
            }}
            currentTopic={topic}
            onSelectTopic={(selectedTopic) => void loadExercises(level, selectedTopic)}
          />
        </div>
      </div>
    )
  }

  if (!currentExercise) {
    return null
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f6_100%)]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() => router.push("/learning/workspace")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à l'espace d'entrainement
        </Button>

        <div className="mb-6 rounded-[30px] border border-slate-200 bg-white/90 px-5 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                  {LEVEL_INFO[level].name}
                </Badge>
                <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  {currentExercise.media_type === "video" ? "Support vidéo" : "Support audio"}
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                {currentExercise.name}
              </h1>
              <p className="text-sm text-slate-500">
                {Math.floor(currentExercise.duration_seconds / 60)}:
                {String(currentExercise.duration_seconds % 60).padStart(2, "0")} d'écoute
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={backToList}
                className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Retour à la liste
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMediaPaneCollapsed((current) => !current)}
                className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                {isMediaPaneCollapsed ? (
                  <PanelLeftOpen className="mr-2 h-4 w-4" />
                ) : (
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                )}
                {isMediaPaneCollapsed ? "Afficher le support" : "Réduire le support"}
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-6",
            isMediaPaneCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-[360px_minmax(0,1fr)]"
          )}
        >
          {!isMediaPaneCollapsed && (
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <MediaPlayer
                exercise={currentExercise}
                showTranscript={showTranscript}
                onTranscriptToggle={handleTranscriptToggle}
                isLoadingTranscript={loading && !transcript}
                onCollapseToggle={() => setIsMediaPaneCollapsed((current) => !current)}
              />

              {showTranscript && <TranscriptView transcript={transcript} loading={loading} />}
            </aside>
          )}

          <section className="min-w-0 space-y-5">
            <div className="sticky top-4 z-20 rounded-[30px] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Navigation
                  </p>
                  <PracticeTypeSelector
                    activeType={activeQuestionType}
                    onSelectType={handleQuestionTypeChange}
                  />
                </div>

                {questions && (
                  <div className="space-y-2 xl:max-w-md">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <ListChecks className="h-4 w-4" />
                      Questions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {questions.questions.map((question, index) => {
                        const answered = userAnswers.some(
                          (answer) =>
                            answer.questionId === question.id && answer.selectedIndices.length > 0
                        )

                        return (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => jumpToQuestion(index)}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                              activeQuestionIndex === index
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : answered
                                  ? "border-teal-500 bg-teal-500 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            )}
                          >
                            {index + 1}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <QuestionsView
              questions={questions}
              activeType={activeQuestionType}
              loading={loading}
              showResults={showResults}
              score={score}
              userAnswers={userAnswers}
              isAnswerCorrect={isAnswerCorrect}
              onAnswerChange={handleAnswerChange}
            />

            <div className="sticky bottom-4 z-20">
              <div className="rounded-[30px] border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/60 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {showResults ? "Résultat final" : "Progression"}
                      </p>
                      <p className="text-sm font-semibold text-teal-700">{currentProgress}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-teal-500 to-teal-400 transition-all"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      {showResults && score
                        ? `${score.correct} bonne${score.correct > 1 ? "s" : ""} réponse${score.correct > 1 ? "s" : ""} sur ${score.total}.`
                        : `${answeredCount} réponse${answeredCount > 1 ? "s" : ""} renseignée${answeredCount > 1 ? "s" : ""} sur ${questionCount || 0}.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {showResults ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => activeQuestionType && void loadQuestions(activeQuestionType)}
                        className="rounded-full border-slate-200 px-5 text-slate-700 hover:bg-slate-100"
                      >
                        Recommencer
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={submitAnswers}
                        disabled={!questions || questionCount === 0 || answeredCount !== questionCount}
                        className="rounded-full bg-teal-500 px-5 text-white hover:bg-teal-500/90 disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        Valider l'exercice
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isMediaPaneCollapsed && (
        <div className="fixed bottom-6 left-6 z-40 hidden w-[320px] rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-300/40 backdrop-blur lg:block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{currentExercise.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {currentExercise.media_type === "video" ? "Mini lecteur vidéo" : "Mini lecteur audio"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsMediaPaneCollapsed(false)}
              className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Rouvrir le support"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-950">
            {currentExercise.media_type === "audio" && currentExercise.audio_url ? (
              <div className="p-3">
                <audio controls src={currentExercise.audio_url} preload="metadata" className="w-full">
                  Votre navigateur ne prend pas en charge l'audio HTML5.
                </audio>
              </div>
            ) : currentExercise.video_url ? (
              <div className="aspect-video">
                <iframe
                  src={currentExercise.video_url}
                  title={currentExercise.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-white/80">Support indisponible.</div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTranscriptToggle}
            className="mt-3 w-full rounded-full border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            {showTranscript ? "Masquer la transcription" : "Afficher la transcription"}
          </Button>
        </div>
      )}
    </div>
  )
}
