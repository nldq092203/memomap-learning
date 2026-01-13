"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { LearningNav } from "@/components/learning/layout/learning-nav"
import { useNumbersDictation } from "@/lib/hooks/use-numbers-dictation"
import type { NumbersType } from "@/lib/services/learning-numbers-api"
import { apiClient } from "@/lib/services/api-client"
import { cn } from "@/lib/utils"
import { Headphones, ListChecks, RefreshCw } from "lucide-react"
import { learningApi, type LearningLanguage } from "@/lib/services/learning-api"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { notificationService } from "@/lib/services/notification-service"

const TYPE_LABELS: Record<NumbersType, string> = {
  YEAR: "Years",
  PHONE: "Phone numbers",
  PRICE: "Prices",
  TIME: "Times",
  ADDRESS: "Addresses",
  STATISTICS: "Statistics",
  MEDICAL: "Medical numbers",
  BANKING: "Banking / finance",
  WEATHER: "Weather data",
  TRANSPORT: "Transport info",
  QUANTITY: "Quantities",
}

export default function NumbersDictationPage() {
  const [selectedTypes, setSelectedTypes] = useState<NumbersType[]>(["YEAR"])
  const [count, setCount] = useState(5)
  const [showInterimSummary, setShowInterimSummary] = useState(false)
  const [inspectedExerciseId, setInspectedExerciseId] = useState<string | null>(null)
  const [isSavingTranscript, setIsSavingTranscript] = useState(false)

  const { lang } = useLearningLang()

  const {
    session,
    current,
    history,
    summary,
    pending,
    progress,
    hasActiveSession,
    startSession,
    updateAnswer,
    submitAnswer,
    finishSession,
    resetSession,
  } = useNumbersDictation()

  const lastAnswered = history.length ? history[history.length - 1] : null
  const feedbackExercise = inspectedExerciseId
    ? history.find(ex => ex.id === inspectedExerciseId) ?? lastAnswered
    : lastAnswered

  const audioSrc = useMemo(() => {
    const ref = current?.audioRef
    if (!ref) return null
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref
    }
    const base = apiClient.getBaseUrl() || ""
    const separator = ref.startsWith("/") ? "" : "/"
    return `${base}${separator}${ref}`
  }, [current])

  const feedbackAudioSrc = useMemo(() => {
    const ref = feedbackExercise?.audioRef
    if (!ref) return null
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref
    }
    const base = apiClient.getBaseUrl() || ""
    const separator = ref.startsWith("/") ? "" : "/"
    return `${base}${separator}${ref}`
  }, [feedbackExercise])

  const answeredCount = history.length
  const correctSoFar = history.filter(ex => ex.isCorrect).length
  const feedbackIndex = feedbackExercise
    ? history.findIndex(ex => ex.id === feedbackExercise.id)
    : -1

  const handleSaveTranscript = async () => {
    if (!history.length) {
      notificationService.info("There is no answer to save yet")
      return
    }

    setIsSavingTranscript(true)
    try {
      const lines: string[] = []

      history.forEach((ex, index) => {
        const errors = ex.errors || []
        const maxErrorIndex = errors.reduce(
          (max, err) => (err.index > max ? err.index : max),
          -1,
        )
        const length = Math.max(ex.answer.length, maxErrorIndex + 1)

        const errorMap = new Map<number, (typeof errors)[number]>()
        for (const err of errors) {
          errorMap.set(err.index, err)
        }

        const expectedChars: string[] = []
        const answerChars: string[] = []
        for (let i = 0; i < length; i += 1) {
          const err = errorMap.get(i)
          const got = i < ex.answer.length ? ex.answer[i] : ""
          const expected = err?.expected ?? got ?? ""
          expectedChars.push(expected || "·")
          answerChars.push(got || "·")
        }

        const expectedDisplay = expectedChars.join("")
        const answerDisplay = answerChars.join("")
        const statusLabel = ex.isCorrect ? "correct" : "incorrect"

        lines.push(
          [
            `#${index + 1} [${ex.numberType}] ${statusLabel}`,
            `Expected: ${expectedDisplay}`,
            `Answer:   ${answerDisplay}`,
          ].join("\n"),
        )
      })

      const transcriptText = lines.join("\n\n")
      const notes = `Numbers Dictation session\n${history.length} answered exercises.`

      await learningApi.createTranscript({
        language: (lang as LearningLanguage) || "fr",
        source_url: null,
        transcript: transcriptText,
        notes,
        comments: null,
        tags: ["numbers_dictation"],
      })

      notificationService.success("Numbers Dictation transcript saved for review ✨")
    } catch (error) {
      console.error("Failed to save Numbers Dictation transcript", error)
      notificationService.error("Failed to save transcript. Please try again.")
    } finally {
      setIsSavingTranscript(false)
    }
  }

  const handleToggleType = (type: NumbersType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const handleCountChange = (value: string) => {
    const parsed = parseInt(value, 10)
    if (Number.isNaN(parsed)) {
      setCount(1)
      return
    }
    const clamped = Math.min(Math.max(parsed, 1), 20)
    setCount(clamped)
  }

  const handleStart = () => {
    setShowInterimSummary(false)
    setInspectedExerciseId(null)
    startSession(selectedTypes, count)
  }

  const handleSubmitAnswer = () => {
    void submitAnswer()
  }

  const handleFinishSession = () => {
    setShowInterimSummary(false)
    setInspectedExerciseId(null)
    void finishSession()
  }

  const handleRestart = () => {
    setShowInterimSummary(false)
    setInspectedExerciseId(null)
    resetSession()
  }

  const handleShowInterimSummary = () => {
    setShowInterimSummary(true)
  }

  const handleHideInterimSummary = () => {
    setShowInterimSummary(false)
  }

  const handleInspectExercise = (exerciseId: string) => {
    setShowInterimSummary(true)
    setInspectedExerciseId(exerciseId)
  }

  const renderDigitFeedback = () => {
    if (!feedbackExercise) return null

    const { answer, errors } = feedbackExercise
    const maxErrorIndex = errors.reduce(
      (max, err) => (err.index > max ? err.index : max),
      -1,
    )
    const length = Math.max(answer.length, maxErrorIndex + 1)
    if (length <= 0) return null

    const errorMap = new Map<number, (typeof errors)[number]>()
    for (const err of errors) {
      errorMap.set(err.index, err)
    }

    const totalPositions = length
    const incorrect = errors.length
    const correct = totalPositions - incorrect

    const expectedChars: string[] = []
    const answerChars: string[] = []
    for (let index = 0; index < length; index += 1) {
      const err = errorMap.get(index)
      const got = index < answer.length ? answer[index] : ""
      const expected = err?.expected ?? got ?? ""
      expectedChars.push(expected || "·")
      answerChars.push(got || "·")
    }

    const expectedDisplay = expectedChars.join("")
    const answerDisplay = answerChars.join("")

    return (
      <div className="mt-4 space-y-3">
        {feedbackAudioSrc && (
          <div className="space-y-1 rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Replay this exercise
            </p>
            <audio
              key={feedbackExercise.id}
              controls
              src={feedbackAudioSrc}
              className="w-full"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Correct digits
            </span>
            <span className="truncate text-foreground">
              {expectedDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Your answer
            </span>
            <span className="truncate">
              {answerDisplay}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Digit accuracy:{" "}
          <span className="font-medium text-foreground">
            {correct} / {totalPositions}
          </span>{" "}
          correct
        </p>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {Array.from({ length }).map((_, index) => {
              const err = errorMap.get(index)
              const got = index < answer.length ? answer[index] : ""
              const expected = err?.expected ?? ""
              const isError = !!err

              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-start text-xs"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm",
                      isError
                        ? "border-destructive/60 bg-destructive/10 text-destructive"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                    )}
                  >
                    {got || "·"}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {isError ? (
                      <span>
                        → {expected || "∅"}
                      </span>
                    ) : (
                      <span className="text-emerald-600">✓</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const showSetup = !hasActiveSession && !summary

  return (
    <div className="min-h-screen bg-background">
      <LearningNav
        breadcrumbs={[
          { label: "Learning", href: "/learning" },
          { label: "Numbers Dictation" },
        ]}
        showBackButton
      />

      <div className="mx-auto max-w-5xl px-4 py-6 text-sm md:py-8 md:text-base">
        {/* Intro / hero */}
        <Card className="mb-6 border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <ListChecks className="h-5 w-5 text-primary" />
                Numbers Dictation
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Practice understanding numbers spoken
                French. Listen to the audio, then type only the digits you hear.
              </CardDescription>
            </div>
            <div className="hidden rounded-xl bg-primary/10 p-2 text-xs text-primary md:flex md:flex-col md:items-center md:justify-center">
              <Headphones className="mb-1 h-4 w-4" />
              <span>Audio-only</span>
              <span className="text-[10px] text-primary/80">
                No transcripts or hints
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Layout */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
          {/* Left: active exercise or completion/summary prompt */}
          <div className="space-y-4">
            {summary && session && (
              <Card className="border-border/70 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base md:text-lg">
                    <span>Session summary</span>
                    <Badge variant="secondary" className="text-[11px]">
                      {session.totalExercises} exercises
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Overall performance across all Numbers Dictation exercises in
                    this session.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Score
                      </p>
                      <p className="text-3xl font-semibold">
                        {Math.round(summary.score * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {summary.correct} / {session.totalExercises} exercises
                        correct
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveTranscript}
                        disabled={isSavingTranscript || !history.length}
                        className="gap-2"
                      >
                        {isSavingTranscript && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}
                        {isSavingTranscript ? "Saving…" : "Save transcript"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRestart}
                      >
                        Start new session
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(TYPE_LABELS) as NumbersType[]).map(type => {
                      const stats = summary.perType[type]
                      if (!stats) return null
                      const accuracy =
                        stats.total > 0
                          ? Math.round((stats.correct / stats.total) * 100)
                          : 0
                      return (
                        <div
                          key={type}
                          className="rounded-xl border border-border/70 bg-muted/40 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {TYPE_LABELS[type]}
                              </p>
                              <p className="mt-1 text-lg font-semibold">
                                {accuracy}%
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="shrink-0 border-border/60 text-[11px]"
                            >
                              {stats.correct} / {stats.total} correct
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {history.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Answered exercises
                      </p>
                      <div className="space-y-1">
                        {history.map((ex, index) => {
                          const active = feedbackExercise?.id === ex.id
                          return (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => handleInspectExercise(ex.id)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition",
                                active
                                  ? "border-primary bg-primary/5"
                                  : "border-border/60 bg-muted/40 hover:border-primary/40",
                              )}
                            >
                              <div className="min-w-0">
                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Exercise {index + 1}
                                  </span>
                                  <span>·</span>
                                  <span className="capitalize">
                                    {TYPE_LABELS[ex.numberType]}
                                  </span>
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-foreground truncate">
                                  {ex.answer || "No answer"}
                                </p>
                              </div>
                              <Badge
                                variant={ex.isCorrect ? "outline" : "destructive"}
                                className="shrink-0 text-[10px]"
                              >
                                {ex.isCorrect ? "Correct" : "Incorrect"}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!summary && session && !showInterimSummary && (
              <Card className="border-border/70 bg-card/70">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base md:text-lg">
                        {current
                          ? `Exercise ${session.completed + 1} of ${session.totalExercises}`
                          : "Session complete"}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        {current
                          ? "Listen to the number in French, then type the digits you hear."
                          : "You’ve answered all exercises in this session. View your summary or start a new session."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <Badge
                        variant="secondary"
                        className="text-[11px] capitalize"
                      >
                        {current
                          ? TYPE_LABELS[current.numberType]
                          : "All types"}
                      </Badge>
                      {session && (
                        <span className="text-[11px] text-muted-foreground">
                          Completed {session.completed} /{" "}
                          {session.totalExercises}
                        </span>
                      )}
                    </div>
                  </div>
                  {session && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-[11px] text-muted-foreground">
                        Progress: {progress}%
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-5">
                  {current ? (
                    <>
                      <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Headphones className="h-4 w-4 text-primary" />
                          Listen carefully. You can replay the audio as needed,
                          but no transcript or digits are shown.
                        </p>
                        {audioSrc ? (
                          <audio
                            key={current.id}
                            controls
                            src={audioSrc}
                            className="mt-1 w-full"
                          >
                            Your browser does not support the audio element.
                          </audio>
                        ) : (
                          <p className="text-xs text-destructive">
                            Audio not available for this exercise.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Your answer (digits only)
                        </label>
                        <Input
                          inputMode="numeric"
                          pattern="[0-9:.]*"
                          autoComplete="off"
                          value={current.answer}
                          onChange={e => {
                            const raw = e.target.value
                            const noSpaces = raw.replace(/\s+/g, "")
                            const sanitized = noSpaces.replace(/[^\d:.]/g, "")
                            updateAnswer(sanitized)
                          }}
                          placeholder={
                            current.numberType === "TIME"
                              ? "Type the time you hear, e.g. 14:35"
                              : "Type the digits you hear, e.g. 0632487091"
                          }
                          disabled={pending}
                          className="h-9 font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Spaces are ignored. Digits, <code>:</code> and{" "}
                          <code>.</code> are supported.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleSubmitAnswer}
                          disabled={pending || !current.answer.trim()}
                          className="gap-2"
                        >
                          {pending && (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          )}
                          {pending ? "Checking..." : "Submit answer"}
                        </Button>
                        {session.completed > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleShowInterimSummary}
                            disabled={pending}
                          >
                            View summary so far
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-start gap-3 text-xs md:text-sm">
                      <p className="text-muted-foreground">
                        All exercises in this session are answered.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={handleFinishSession}
                          disabled={pending || !session?.completed}
                          className="gap-2"
                        >
                          {pending && (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          )}
                          View session summary
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRestart}
                          disabled={pending}
                        >
                          Start new session
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!summary && session && showInterimSummary && (
              <Card className="border-border/70 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base md:text-lg">
                    <span>Summary so far</span>
                    <Badge variant="secondary" className="text-[11px]">
                      {answeredCount} / {session.totalExercises} answered
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Based on the exercises you&apos;ve answered in this
                    session so far.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Score so far
                      </p>
                      <p className="text-3xl font-semibold">
                        {answeredCount > 0
                          ? Math.round((correctSoFar / answeredCount) * 100)
                          : 0}
                        %
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {correctSoFar} / {answeredCount} answers correct so far
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleHideInterimSummary}
                      >
                        Back to exercise
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleFinishSession}
                        disabled={pending || !session.completed}
                        className="gap-2"
                      >
                        {pending && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}
                        End session &amp; view full summary
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(TYPE_LABELS) as NumbersType[]).map(type => {
                      const stats = history.reduce(
                        (acc, ex) => {
                          if (ex.numberType !== type) return acc
                          acc.total += 1
                          if (ex.isCorrect) {
                            acc.correct += 1
                          } else {
                            acc.incorrect += 1
                          }
                          return acc
                        },
                        { total: 0, correct: 0, incorrect: 0 },
                      )

                      if (!stats.total) return null

                      const accuracy =
                        stats.total > 0
                          ? Math.round((stats.correct / stats.total) * 100)
                          : 0

                      return (
                        <div
                          key={type}
                          className="rounded-xl border border-border/70 bg-muted/40 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {TYPE_LABELS[type]}
                              </p>
                              <p className="mt-1 text-lg font-semibold">
                                {accuracy}%
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="shrink-0 border-border/60 text-[11px]"
                            >
                              {stats.correct} / {stats.total} correct
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!session && !summary && (
              <Card className="border-dashed border-border/70 bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">
                    Start a Numbers Dictation session
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Choose which types of numbers you want to practice and how
                    many exercises to include.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Once you start, you&apos;ll only hear audio. Digits, spoken
                    chunks, and sentences are never shown before you answer.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: configuration + last answer feedback */}
          <div className="space-y-4">
            <Card className="border-border/70 bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm md:text-base">
                  Session setup
                </CardTitle>
                <CardDescription className="text-xs">
                  Select number types and how many exercises you want in this
                  practice set.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Number types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TYPE_LABELS) as NumbersType[]).map(type => {
                      const active = selectedTypes.includes(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleToggleType(type)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                          )}
                          aria-pressed={active}
                        >
                          {TYPE_LABELS[type]}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    You can combine different number types (years, phone
                    numbers, prices, times, etc.) in a single session.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Number of exercises
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={count}
                      onChange={e => handleCountChange(e.target.value)}
                      className="h-8 w-20"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Min 1, max 20 exercises
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={handleStart}
                    disabled={!selectedTypes.length || pending}
                    className="w-full gap-2"
                  >
                    {pending && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    {showSetup
                      ? "Start Numbers Dictation"
                      : "Restart with new session"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {feedbackExercise && !summary && (
              <Card className="border-border/70 bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {feedbackIndex >= 0
                        ? `Exercise ${feedbackIndex + 1} feedback`
                        : "Exercise feedback"}
                    </span>
                    <Badge
                      variant={feedbackExercise.isCorrect ? "default" : "destructive"}
                      className="text-[11px]"
                    >
                      {feedbackExercise.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Digit-level feedback for this exercise. Use the summary on
                    the left to review any earlier answers.
                  </CardDescription>
                </CardHeader>
                <CardContent>{renderDigitFeedback()}</CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
