import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  isDocumentComprehensionExerciseType,
  isNestedQuestionExerciseType,
  type DelfTestPaperDetailResponse,
  type MatchingAnswer,
} from "@/lib/types/api/delf"
import { learningDelfApi } from "@/lib/services/learning-delf-api"
import { SupportProjectTrigger } from "@/components/auth/support-project-trigger"
import { ExerciseView } from "@/components/learning/delf/exercise-view"
import { MatchingExerciseView } from "@/components/learning/delf/matching-exercise-view"
import { ExtraTranscriptView } from "@/components/learning/delf/extra-transcript-view"
import { DocumentComprehensionView } from "@/components/learning/delf/document-comprehension-view"
import { MultipleChoiceSetView } from "@/components/learning/delf/multiple-choice-set-view"
import { AlertCircle, BookOpen, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react"

interface TestPlayerProps {
  test: DelfTestPaperDetailResponse
  userAnswers: { exerciseId: string; selectedOption: number }[]
  matchingAnswers: MatchingAnswer[]
  subQuestionAnswers: Record<string, any>
  showResults: boolean
  score: { correct: number; total: number; percentage: number } | null
  onAnswer: (exerciseId: string, optionIndex: number) => void
  onMatchAnswer: (exerciseId: string, docId: string, personLabel: string) => void
  onAnswerSubQuestion: (questionId: string, value: any) => void
  onSubmit: () => void
  onRestartTest: () => void
  onBackToList: () => void
  onBackToRoot: () => void
}

export function TestPlayer({
  test,
  userAnswers,
  matchingAnswers,
  subQuestionAnswers,
  showResults,
  score,
  onAnswer,
  onMatchAnswer,
  onAnswerSubQuestion,
  onSubmit,
  onRestartTest,
  onBackToRoot,
}: TestPlayerProps) {
  const content = test.content
  const section = test.section
  const numericTestId = test.test_id.match(/\d+/)?.[0]
  const exerciseLabel = numericTestId ? `Exercice ${Number(numericTestId)}` : `Exercice ${test.test_id}`

  const allAnswered = content.exercises.every((exercise) => {
    if (exercise.type === "matching") {
      const matchAnswer = matchingAnswers.find((answer) => answer.exerciseId === exercise.id)
      return exercise.documents?.every((doc) => matchAnswer?.selections[doc.id]) ?? false
    }

    if (isNestedQuestionExerciseType(exercise.type)) {
      const questions = exercise.questions || []
      return questions.every((question) => {
        const answer = subQuestionAnswers[question.id]
        if (answer === undefined || answer === null) return false
        if (question.type === "multiple_select_image") {
          return Array.isArray(answer) && answer.length > 0
        }
        if (question.type === "label_matching") {
          const mapped = answer as Record<string, number>
          return Object.keys(mapped).length > 0 && Object.values(mapped).every((value) => value !== undefined)
        }
        return true
      })
    }

    return userAnswers.some((answer) => answer.exerciseId === exercise.id)
  })

  const totalQuestionCount = content.exercises.reduce((total, exercise) => {
    if (exercise.type === "matching") return total + (exercise.documents?.length ?? 0)
    if (isNestedQuestionExerciseType(exercise.type)) return total + (exercise.questions?.length ?? 0)
    return total + 1
  }, 0)
  const answeredExerciseCount = content.exercises.filter((exercise) => {
    if (exercise.type === "matching") {
      const matchAnswer = matchingAnswers.find((answer) => answer.exerciseId === exercise.id)
      return exercise.documents?.every((doc) => matchAnswer?.selections[doc.id]) ?? false
    }

    if (isNestedQuestionExerciseType(exercise.type)) {
      const questions = exercise.questions || []
      return questions.every((question) => subQuestionAnswers[question.id] !== undefined)
    }

    return userAnswers.some((answer) => answer.exerciseId === exercise.id)
  }).length
  const answeredQuestionCount = content.exercises.reduce((total, exercise) => {
    if (exercise.type === "matching") {
      const matchAnswer = matchingAnswers.find((answer) => answer.exerciseId === exercise.id)
      return total + (exercise.documents?.filter((doc) => matchAnswer?.selections[doc.id]).length ?? 0)
    }

    if (isNestedQuestionExerciseType(exercise.type)) {
      return total + (exercise.questions?.filter((question) => subQuestionAnswers[question.id] !== undefined).length ?? 0)
    }

    return total + (userAnswers.some((answer) => answer.exerciseId === exercise.id) ? 1 : 0)
  }, 0)

  const progressRatio = totalQuestionCount > 0 ? Math.round((answeredQuestionCount / totalQuestionCount) * 100) : 0

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const progressBarRef = useRef<HTMLButtonElement | null>(null)
  const [activeAudioIndex, setActiveAudioIndex] = useState(0)

  const audioFilenames = [
    ...(content.audio_filenames?.filter(Boolean) ?? []),
    ...(!content.audio_filenames?.length && content.audio_filename ? [content.audio_filename] : []),
  ]
  const audioItems = audioFilenames.length > 0
    ? audioFilenames.map((filename, index) => ({
        filename,
        label: audioFilenames.length > 1 ? `Document ${index + 1}` : "Audio",
        url: learningDelfApi.getAudioProxyUrl(test.level, test.variant, test.section, filename),
      }))
    : test.audio_url
      ? [{ filename: "audio", label: "Audio", url: test.audio_url }]
      : []
  const audioUrl = audioItems[activeAudioIndex]?.url

  useEffect(() => {
    setActiveAudioIndex(0)
  }, [test.test_id])

  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    audioRef.current?.load()
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100)
    }
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(100)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    void audioRef.current.play()
    setIsPlaying(true)
  }

  const handleRestart = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setProgress(0)
    if (!isPlaying) {
      void audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSkip = (deltaSeconds: number) => {
    if (!audioRef.current) return

    const nextTime = Math.min(
      Math.max(audioRef.current.currentTime + deltaSeconds, 0),
      audioRef.current.duration || duration || 0
    )
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
    setProgress(audioRef.current.duration ? (nextTime / audioRef.current.duration) * 100 : 0)
  }

  const handleSeek = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!audioRef.current || !progressBarRef.current) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const ratio = rect.width > 0 ? clickX / rect.width : 0
    const nextTime = ratio * (audioRef.current.duration || duration || 0)

    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
    setProgress(ratio * 100)
  }

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return ""
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="sticky top-4 z-20 rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 p-4 shadow-[0_14px_34px_rgba(74,51,35,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-[var(--vintage-cream)] px-3 py-1 text-xs font-semibold text-[var(--vintage-desert-rock)]">
                  {test.level} {test.section}
                </div>
                <div className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                  Variante {test.variant}
                </div>
                {showResults && score && (
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      score.percentage >= 50
                        ? "bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {score.correct} / {score.total} · {score.percentage}%
                  </div>
                )}
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--vintage-ink)]">{exerciseLabel}</h2>
            </div>

            {section === "CO" && audioUrl && (
              <div className="w-full rounded-[22px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] p-3 sm:p-4 lg:max-w-[560px]">
                {audioItems.length > 1 && (
                  <div className="mb-3 grid gap-2 sm:grid-cols-3">
                    {audioItems.map((item, index) => (
                      <Button
                        key={`${item.filename}-${index}`}
                        type="button"
                        variant={activeAudioIndex === index ? "default" : "outline"}
                        size="sm"
                        className={`h-9 rounded-full text-xs ${
                          activeAudioIndex === index
                            ? "bg-[var(--vintage-desert-rock)] text-white hover:bg-[#8f7763]"
                            : "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/80 text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)]"
                        }`}
                        onClick={() => setActiveAudioIndex(index)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      size="icon"
                      onClick={togglePlay}
                      className="h-10 w-10 shrink-0 rounded-full bg-[var(--vintage-desert-rock)] text-white hover:bg-[#8f7763] sm:h-11 sm:w-11"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRestart}
                      className="h-9 w-9 shrink-0 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] sm:h-10 sm:w-10"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSkip(-5)}
                      className="h-9 w-9 shrink-0 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] sm:h-10 sm:w-10"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSkip(5)}
                      className="h-9 w-9 shrink-0 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] sm:h-10 sm:w-10"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <button
                      ref={progressBarRef}
                      type="button"
                      onClick={handleSeek}
                      className="block w-full cursor-pointer"
                      aria-label="Seek audio"
                    >
                      <Progress value={progress} className="h-2 bg-[var(--vintage-cream)] [&>div]:bg-[var(--vintage-desert-rock)]" />
                    </button>
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--vintage-muted-ink)]">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
                <audio ref={audioRef} src={audioUrl} className="hidden" />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--vintage-muted-ink)]">Progression</span>
              <span className="text-[var(--vintage-desert-rock)]">{showResults ? score?.percentage ?? 100 : progressRatio}%</span>
            </div>
            <Progress value={showResults ? score?.percentage ?? 100 : progressRatio} className="h-2 bg-[var(--vintage-cream)] [&>div]:bg-[var(--vintage-desert-rock)]" />
          </div>
        </div>
      </div>

      {section === "CE" && content.extra_transcripts?.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 px-1 text-lg font-semibold text-[var(--vintage-ink)]">
            <AlertCircle className="h-5 w-5 text-[var(--vintage-desert-rock)]" />
            Documents de lecture
          </h3>
          <ExtraTranscriptView transcripts={content.extra_transcripts} />
        </div>
      )}

      <div className="space-y-6">
        <h3 className="flex items-center gap-2 px-1 text-lg font-semibold text-[var(--vintage-ink)]">
          <BookOpen className="h-5 w-5 text-[var(--vintage-desert-rock)]" />
          Questions
        </h3>

        {content.exercises.map((exercise, index) => {
          if (exercise.type === "matching") {
            const matchAnswer = matchingAnswers.find((answer) => answer.exerciseId === exercise.id)
            return (
              <MatchingExerciseView
                key={exercise.id}
                exercise={exercise}
                index={index}
                selections={matchAnswer?.selections || {}}
                showResults={showResults}
                onSelectMatch={(docId, personLabel) => onMatchAnswer(exercise.id, docId, personLabel)}
              />
            )
          }

          if (isDocumentComprehensionExerciseType(exercise.type)) {
            return (
              <DocumentComprehensionView
                key={exercise.id}
                exercise={exercise}
                index={index}
                subQuestionAnswers={subQuestionAnswers}
                showResults={showResults}
                onAnswerSubQuestion={onAnswerSubQuestion}
                getAssetUrl={(filename) => learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)}
              />
            )
          }

          if (isNestedQuestionExerciseType(exercise.type)) {
            return (
              <MultipleChoiceSetView
                key={exercise.id}
                exercise={exercise}
                index={index}
                subQuestionAnswers={subQuestionAnswers}
                showResults={showResults}
                onAnswerSubQuestion={onAnswerSubQuestion}
                getAssetUrl={(filename) => learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)}
              />
            )
          }

          const userAnswer = userAnswers.find((answer) => answer.exerciseId === exercise.id)
          const isCorrect = showResults ? userAnswer?.selectedOption === exercise.correct_answer : null

          return (
            <ExerciseView
              key={exercise.id}
              exercise={exercise}
              index={index}
              selectedOption={userAnswer?.selectedOption}
              isCorrect={isCorrect ?? null}
              showResults={showResults}
              onAnswer={(optionIndex) => onAnswer(exercise.id, optionIndex)}
              getAssetUrl={(filename) => learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)}
            />
          )
        })}
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 px-4 py-3 shadow-[0_18px_42px_rgba(74,51,35,0.12)] backdrop-blur sm:flex-row sm:justify-between sm:rounded-[30px] sm:px-5 sm:py-4">
          <div className="text-center text-sm text-[var(--vintage-muted-ink)] sm:text-left">
            {!showResults
              ? `${answeredQuestionCount} question${answeredQuestionCount > 1 ? "s" : ""} complétée${answeredQuestionCount > 1 ? "s" : ""} sur ${totalQuestionCount}.`
              : "Votre correction est affichée ci-dessus."}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={onBackToRoot} className="w-full rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)] sm:w-auto">
              Quitter
            </Button>

            {!showResults ? (
              <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
                <Button
                  onClick={onSubmit}
                  size="lg"
                  className="w-full rounded-full px-8 sm:w-auto"
                  variant={allAnswered ? "default" : "outline"}
                  disabled={!allAnswered}
                  style={allAnswered ? { backgroundColor: "var(--vintage-desert-rock)", color: "white" } : undefined}
                >
                  Valider l&apos;exercice
                </Button>
                {!allAnswered && (
                  <p className="text-center text-xs text-[var(--vintage-muted-ink)]">Répondez à toutes les questions pour valider.</p>
                )}
              </div>
            ) : (
              <>
                <div className="w-full min-w-0 sm:min-w-[280px]">
                  <SupportProjectTrigger variant="result" />
                </div>
                <Button
                  onClick={onRestartTest}
                  size="lg"
                  className="w-full rounded-full bg-[var(--vintage-cream)] px-8 text-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-soft-sandstone)] sm:w-auto"
                >
                  Recommencer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
