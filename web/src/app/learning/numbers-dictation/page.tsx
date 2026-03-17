"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useNumbersDictation } from "@/lib/hooks/use-numbers-dictation"
import type { NumbersType } from "@/lib/services/learning-numbers-api"
import { learningApi, type LearningLanguage } from "@/lib/services/learning-api"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { useGuest } from "@/lib/contexts/guest-context"
import { notificationService } from "@/lib/services/notification-service"
import { apiClient } from "@/lib/services/api-client"
import { cn } from "@/lib/utils"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"
import { SupportProjectTrigger } from "@/components/auth/support-project-trigger"
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesColumn,
  CircleDollarSign,
  Delete,
  Headphones,
  ListChecks,
  Pause,
  Percent,
  Phone,
  Play,
  RotateCcw,
  RotateCw,
  TimerReset,
} from "lucide-react"

const TYPE_LABELS: Record<NumbersType, string> = {
  YEAR: "Annees",
  PHONE: "Telephones",
  PRICE: "Prix",
  TIME: "Heures",
  ADDRESS: "Adresses",
  STATISTICS: "Statistiques",
  MEDICAL: "Medical",
  BANKING: "Banque",
  WEATHER: "Meteo",
  TRANSPORT: "Transport",
  QUANTITY: "Quantites",
}

const TYPE_ICONS: Record<NumbersType, React.ElementType> = {
  YEAR: CalendarDays,
  PHONE: Phone,
  PRICE: CircleDollarSign,
  TIME: TimerReset,
  ADDRESS: ListChecks,
  STATISTICS: ChartNoAxesColumn,
  MEDICAL: Headphones,
  BANKING: CircleDollarSign,
  WEATHER: ChartNoAxesColumn,
  TRANSPORT: ListChecks,
  QUANTITY: Percent,
}

const NUMPAD_BASE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", ":"]

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export default function NumbersDictationPage() {
  const router = useRouter()
  const { lang } = useLearningLang()
  const { isGuest, setShowSyncModal } = useGuest()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [selectedTypes, setSelectedTypes] = useState<NumbersType[]>(["YEAR", "PRICE", "PHONE"])
  const [count, setCount] = useState(8)
  const [isSavingTranscript, setIsSavingTranscript] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [shakeInput, setShakeInput] = useState(false)

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
    advanceToNextExercise,
    finishSession,
    resetSession,
  } = useNumbersDictation()

  const answeredCurrent = current?.isCorrect != null
  const latestExercise = current?.isCorrect != null ? current : history[history.length - 1] ?? null
  const latestErrors = latestExercise?.errors ?? []
  const perfectCurrent = !!latestExercise && latestExercise.isCorrect && latestErrors.length === 0

  const audioSrc = useMemo(() => {
    const ref = current?.audioRef
    if (!ref) return null
    if (ref.startsWith("http://") || ref.startsWith("https://")) return ref
    const base = apiClient.getBaseUrl() || ""
    const separator = ref.startsWith("/") ? "" : "/"
    return `${base}${separator}${ref}`
  }, [current])

  const allowedSymbols = useMemo(() => {
    if (!current) return [".", ":"]
    if (current.numberType === "TIME") return [":"]
    if (current.numberType === "PRICE" || current.numberType === "STATISTICS") return ["."]
    return []
  }, [current])

  const numpadKeys = useMemo(
    () => NUMPAD_BASE.filter((key) => /\d/.test(key) || allowedSymbols.includes(key)),
    [allowedSymbols],
  )
  const minExerciseCount = 1
  const maxExerciseCount = isGuest ? 2 : 20

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncTime = () => setCurrentTime(audio.currentTime)
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", syncTime)
    audio.addEventListener("loadedmetadata", syncDuration)
    audio.addEventListener("durationchange", syncDuration)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", syncTime)
      audio.removeEventListener("loadedmetadata", syncDuration)
      audio.removeEventListener("durationchange", syncDuration)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioSrc])

  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [audioSrc])

  useEffect(() => {
    if (!answeredCurrent || current?.isCorrect !== false) return
    setShakeInput(true)
    const timeout = window.setTimeout(() => setShakeInput(false), 420)
    return () => window.clearTimeout(timeout)
  }, [answeredCurrent, current?.isCorrect])

  useEffect(() => {
    setCount((prev) => Math.min(maxExerciseCount, Math.max(minExerciseCount, prev)))
  }, [maxExerciseCount])

  const handleAudioToggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch (error) {
        console.error("Impossible de lancer l'audio", error)
      }
      return
    }
    audio.pause()
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
  }

  const handleJump = (delta: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta))
  }

  const handleAppendKey = (key: string) => {
    if (!current || answeredCurrent || pending) return
    updateAnswer(`${current.answer}${key}`)
  }

  const handleDelete = () => {
    if (!current || answeredCurrent || pending) return
    updateAnswer(current.answer.slice(0, -1))
  }

  const handleClear = () => {
    if (!current || answeredCurrent || pending) return
    updateAnswer("")
  }

  const handleSaveTranscript = async () => {
    if (!history.length) {
      notificationService.info("Aucune reponse a enregistrer.")
      return
    }

    setIsSavingTranscript(true)
    try {
      const transcriptText = history
        .map((exercise, index) => {
          const expected = buildExpectedString(exercise.answer, exercise.errors)
          return [
            `#${index + 1} · ${TYPE_LABELS[exercise.numberType]}`,
            `Attendu: ${expected}`,
            `Reponse: ${exercise.answer || "·"}`,
            `Resultat: ${exercise.isCorrect ? "correct" : "incorrect"}`,
          ].join("\n")
        })
        .join("\n\n")

      await learningApi.createTranscript({
        language: (lang as LearningLanguage) || "fr",
        source_url: null,
        transcript: transcriptText,
        notes: "Session de dictee de nombres",
        comments: null,
        tags: ["numbers_dictation"],
      })

      notificationService.success("Session enregistree pour revision.")
    } catch (error) {
      console.error("Failed to save transcript", error)
      notificationService.error("Impossible d'enregistrer la session.")
    } finally {
      setIsSavingTranscript(false)
    }
  }

  const handleStart = () => {
    if (count <= 0) {
      return
    }

    void startSession(selectedTypes, count, isGuest)
  }

  const handleSubmit = () => {
    void submitAnswer()
  }

  const handleNext = () => {
    void advanceToNextExercise()
  }

  const handleFinish = () => {
    void finishSession()
  }

  const showSetup = !hasActiveSession && !summary

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => router.push("/learning/workspace")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour a l&apos;espace d&apos;entrainement
        </Button>

        {showSetup && (
          <section className="mx-auto max-w-5xl">
            <Card className="overflow-hidden border-border/70 bg-card/90">
              <CardHeader className="border-b border-border/60 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <ListChecks className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                        Dictee de nombres
                      </span>
                    </div>
                    <CardTitle className="mt-3 text-3xl tracking-tight">
                      Preparation de session
                    </CardTitle>
                  </div>
                  <Badge className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/10">
                    <Headphones className="mr-2 h-4 w-4" />
                    Audio uniquement
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                  <GuestUpgradeHint description="Connectez-vous pour pratiquer plus de séries, accéder à davantage de dictées de nombres et sauvegarder vos résultats." />

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Types de nombres
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {(Object.keys(TYPE_LABELS) as NumbersType[]).map((type) => {
                        const active = selectedTypes.includes(type)
                        const Icon = TYPE_ICONS[type]
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedTypes((prev) =>
                              prev.includes(type)
                                ? prev.filter((item) => item !== type)
                                : [...prev, type]
                            )}
                            className={cn(
                              "rounded-[22px] border px-4 py-5 text-left transition-all",
                              active
                                ? "border-primary/30 bg-primary/10 shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                                : "border-border/70 bg-white hover:border-primary/20 hover:bg-primary/5"
                            )}
                          >
                            <Icon className={cn("mb-4 h-6 w-6", active ? "text-primary" : "text-muted-foreground")} />
                            <p className="font-semibold text-foreground">{TYPE_LABELS[type]}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Nombre d&apos;exercices
                      </p>
                      <span className="text-sm text-muted-foreground">
                        Min {minExerciseCount} · Max {maxExerciseCount}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={minExerciseCount}
                      max={maxExerciseCount}
                      value={count}
                      onChange={(event) => {
                        const next = Number(event.target.value)
                        if (Number.isNaN(next)) {
                          setCount(minExerciseCount)
                          return
                        }
                        setCount(Math.min(maxExerciseCount, Math.max(minExerciseCount, next)))
                      }}
                      className="h-14 w-full rounded-2xl text-center text-2xl font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[28px] border border-border/70 bg-muted/30 p-5">
                  <div className="space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Mode
                      </p>
                      <p className="mt-2 text-xl font-semibold">Ecoute + saisie rapide</p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="rounded-2xl bg-white px-4 py-3">Lecture, pause, replay, retour 5s</div>
                      <div className="rounded-2xl bg-white px-4 py-3">Pave numerique integre</div>
                      <div className="rounded-2xl bg-white px-4 py-3">Feedback chiffre par chiffre</div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    onClick={handleStart}
                    disabled={!selectedTypes.length || pending}
                    className="mt-6 h-14 rounded-2xl text-base font-semibold shadow-[0_18px_40px_rgba(16,185,129,0.18)]"
                  >
                    Commencer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {!showSetup && !summary && session && (
          <section className="mx-auto max-w-4xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Dictee de nombres
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Exercice {Math.min(session.completed + 1, session.totalExercises)} / {session.totalExercises}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Progression</p>
                <p className="text-2xl font-semibold text-primary">{progress}%</p>
              </div>
            </div>

            <Card className="overflow-hidden border-border/70 bg-card/95">
              <CardContent className="space-y-8 p-6 md:p-8">
                {current ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <Badge className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/10">
                        {TYPE_LABELS[current.numberType]}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-4 py-2">
                        <Headphones className="mr-2 h-4 w-4" />
                        Audio
                      </Badge>
                    </div>

                    <ExerciseAudioPlayer
                      audioRef={audioRef}
                      audioSrc={audioSrc}
                      currentTime={currentTime}
                      duration={duration}
                      isPlaying={isPlaying}
                      onToggle={handleAudioToggle}
                      onJump={handleJump}
                      onSeek={handleSeek}
                    />

                    <div className="relative space-y-4">
                      {perfectCurrent && <SparkleBurst />}
                      <div
                        className={cn(
                          "rounded-[28px] border border-border/70 bg-muted/20 p-4 md:p-6",
                          shakeInput && "animate-[numbers-shake_0.38s_ease-in-out]"
                        )}
                      >
                        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Votre reponse
                        </label>
                        <Input
                          inputMode="numeric"
                          pattern="[0-9:.]*"
                          autoComplete="off"
                          value={current.answer}
                          onChange={(event) => {
                            const sanitized = event.target.value.replace(/\s+/g, "").replace(/[^\d:.]/g, "")
                            updateAnswer(sanitized)
                          }}
                          placeholder="Saisir"
                          disabled={pending || answeredCurrent}
                          className="h-24 rounded-[24px] border-border bg-white px-6 text-center font-mono text-4xl font-semibold tracking-[0.18em] shadow-sm placeholder:tracking-normal"
                        />

                        {answeredCurrent && latestExercise && (
                          <InlineDigitFeedback exercise={latestExercise} />
                        )}
                      </div>

                      <VirtualNumpad
                        keys={numpadKeys}
                        onPress={handleAppendKey}
                        onDelete={handleDelete}
                        onClear={handleClear}
                        disabled={pending || answeredCurrent}
                      />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                      {!answeredCurrent ? (
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleSubmit}
                          disabled={pending || !current.answer.trim()}
                          className="h-14 rounded-2xl px-8 text-base font-semibold"
                        >
                          {pending ? "Verification..." : "Valider"}
                        </Button>
                      ) : session.completed < session.totalExercises ? (
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleNext}
                          className="h-14 rounded-2xl px-8 text-base font-semibold"
                        >
                          Exercice suivant
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleFinish}
                          className="h-14 rounded-2xl px-8 text-base font-semibold"
                        >
                          Voir le bilan
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <p className="text-xl font-semibold">Session terminee</p>
                    <Button type="button" size="lg" onClick={handleFinish} className="h-14 rounded-2xl px-8">
                      Voir le bilan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {summary && session && (
          <section className="mx-auto max-w-4xl">
            <Card className="border-border/70 bg-card/95">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Bilan
                    </p>
                    <CardTitle className="mt-2 text-3xl tracking-tight">
                      {Math.round(summary.score * 100)}% de reussite
                    </CardTitle>
                  </div>
                  <Badge className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/10">
                    {summary.correct} / {session.totalExercises} corrects
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(TYPE_LABELS) as NumbersType[]).map((type) => {
                    const stats = summary.perType[type]
                    if (!stats) return null
                    const accuracy = Math.round((stats.correct / stats.total) * 100)
                    const Icon = TYPE_ICONS[type]
                    return (
                      <div key={type} className="rounded-[22px] border border-border/70 bg-muted/30 p-4">
                        <div className="mb-3 flex items-center gap-2 text-primary">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{TYPE_LABELS[type]}</span>
                        </div>
                        <p className="text-2xl font-semibold">{accuracy}%</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.correct} / {stats.total}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  {isGuest ? (
                    <Button type="button" onClick={() => setShowSyncModal(true)} className="rounded-2xl">
                      Se connecter pour enregistrer
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleSaveTranscript} disabled={isSavingTranscript} className="rounded-2xl">
                      {isSavingTranscript ? "Sauvegarde..." : "Enregistrer la session"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetSession()
                      router.refresh()
                    }}
                    className="rounded-2xl"
                  >
                    Nouvelle session
                  </Button>
                </div>

                <SupportProjectTrigger variant="result" />
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <style jsx global>{`
        @keyframes numbers-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

function ExerciseAudioPlayer({
  audioRef,
  audioSrc,
  currentTime,
  duration,
  isPlaying,
  onToggle,
  onJump,
  onSeek,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>
  audioSrc: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  onToggle: () => void
  onJump: (delta: number) => void
  onSeek: (value: number) => void
}) {
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="rounded-[30px] border border-border/70 bg-muted/20 p-6">
      <audio ref={audioRef} src={audioSrc ?? undefined} preload="metadata" className="hidden" />

      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <Button type="button" size="icon" variant="ghost" className="h-12 w-12 rounded-full" onClick={() => onJump(-5)} disabled={!audioSrc}>
            <RotateCcw className="h-5 w-5" />
          </Button>

          <button
            type="button"
            onClick={onToggle}
            disabled={!audioSrc}
            className="relative flex h-36 w-36 items-center justify-center rounded-full disabled:opacity-50"
            aria-label={isPlaying ? "Pause audio" : "Lire audio"}
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} className="fill-none stroke-emerald-100" strokeWidth="8" />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="fill-none stroke-[hsl(var(--primary))] transition-all"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
              {isPlaying ? <Pause className="h-10 w-10 fill-current" /> : <Play className="ml-1 h-10 w-10 fill-current" />}
            </span>
          </button>

          <Button type="button" size="icon" variant="ghost" className="h-12 w-12 rounded-full" onClick={() => onJump(5)} disabled={!audioSrc}>
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>

        <div className="w-full max-w-2xl space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-100 accent-primary"
            disabled={!audioSrc}
          />
        </div>
      </div>
    </div>
  )
}

function VirtualNumpad({
  keys,
  onPress,
  onDelete,
  onClear,
  disabled,
}: {
  keys: string[]
  onPress: (key: string) => void
  onDelete: () => void
  onClear: () => void
  disabled: boolean
}) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-white p-4">
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPress(key)}
            className="h-16 rounded-2xl border border-border/70 bg-muted/20 text-2xl font-semibold transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="h-16 rounded-2xl border border-border/70 bg-muted/20 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
        >
          Effacer
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="col-span-2 flex h-16 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/20 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
        >
          <Delete className="h-4 w-4" />
          Supprimer
        </button>
      </div>
    </div>
  )
}

function InlineDigitFeedback({
  exercise,
}: {
  exercise: {
    answer: string
    errors: Array<{ index: number; expected: string }>
    isCorrect: boolean | null
    script?: string | null
  }
}) {
  const errorMap = new Map(exercise.errors.map((error) => [error.index, error]))
  const length = Math.max(
    exercise.answer.length,
    exercise.errors.reduce((max, error) => Math.max(max, error.index + 1), 0)
  )

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge
          className={cn(
            "rounded-full px-3 py-1.5",
            exercise.isCorrect
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-rose-100 text-rose-700 hover:bg-rose-100"
          )}
        >
          {exercise.isCorrect ? "Correct" : "A corriger"}
        </Badge>
        <span className="text-xs text-muted-foreground">Feedback chiffre par chiffre</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length }).map((_, index) => {
          const error = errorMap.get(index)
          const got = exercise.answer[index] || "·"
          return (
            <div key={index} className="flex min-w-[54px] flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-lg font-semibold",
                  error
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-emerald-300 bg-emerald-50 text-emerald-600"
                )}
              >
                {got}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {error ? `→ ${error.expected || "∅"}` : "OK"}
              </div>
            </div>
          )
        })}
      </div>

      {exercise.script && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Transcription
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {exercise.script}
          </p>
        </div>
      )}
    </div>
  )
}

function SparkleBurst() {
  const dots = [
    "left-[10%] top-4",
    "left-[22%] top-1",
    "left-[40%] top-5",
    "left-[58%] top-2",
    "left-[72%] top-6",
    "left-[86%] top-3",
  ]

  return (
    <div className="pointer-events-none absolute inset-x-10 -top-2 h-10">
      {dots.map((position, index) => (
        <span
          key={position}
          className={cn(
            "absolute h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping",
            position
          )}
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  )
}

function buildExpectedString(
  answer: string,
  errors: Array<{ index: number; expected: string }>
) {
  const errorMap = new Map(errors.map((error) => [error.index, error.expected]))
  const length = Math.max(
    answer.length,
    errors.reduce((max, error) => Math.max(max, error.index + 1), 0)
  )

  return Array.from({ length })
    .map((_, index) => errorMap.get(index) ?? answer[index] ?? "·")
    .join("")
}
