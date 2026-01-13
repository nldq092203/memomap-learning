"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { LoginButton } from "@/components/auth/login-button"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Layers,
  Mic,
  Sparkles,
  Target,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { Progress } from "@/components/ui/progress"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, error } = useAuth()
  const { lang } = useLearningLang()

  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = window.localStorage.getItem("onboarding_fr_steps")
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  const onboardingSteps = [
    {
      id: "session",
      title: "Démarre ta première Learning session",
      description:
        "Depuis le Dashboard, crée une session pour enregistrer le temps que tu passes à étudier. Cela te permet de suivre tes minutes par jour et ta progression globale.",
      cta: "Créer une session",
      icon: Target,
      action: () => router.push("/learning"),
    },
    {
      id: "vocab",
      title: "Crée ton carnet de vocabulaire",
      description:
        "Dans l’onglet Vocabulary, ajoute 3–5 nouvelles cartes (mots, expressions) que tu veux retenir. Tu peux aussi utiliser Cmd+Shift+A partout ou le bouton Add Vocabulary après une recherche IA.",
      cta: "Aller à Vocabulary",
      icon: BookOpen,
      action: () => router.push("/learning/vocab"),
    },
    {
      id: "ai",
      title: "Pose des questions à l’IA en contexte",
      description:
        "Depuis le Training workspace, clique sur la bulle flottante ou utilise Cmd/Ctrl + Shift + S pour ouvrir la fenêtre IA. Demande des traductions, exemples ou explications, puis enregistre les mots utiles dans ton vocabulaire.",
      cta: "Ouvrir Training",
      icon: Sparkles,
      action: () => router.push("/learning/workspace"),
    },
    {
      id: "transcribe",
      title: "Transcris un court audio français",
      description:
        "Dans Transcribe, enregistre ou importe un audio (podcast, vidéo, message vocal) puis génère une transcription avec Whisper ou tape-la manuellement. Sauvegarde-la pour la réutiliser dans tes exercices.",
      cta: "Aller à Transcribe",
      icon: Mic,
      action: () => router.push("/learning/transcribe"),
    },
    {
      id: "training",
      title: "Teste les deux exercices d’entraînement",
      description:
        "Dans Training, lance une session de dictée classique à partir de tes transcriptions, puis essaie Numbers Dictation pour les années, prix et numéros. Le minuteur flottant enregistre ton temps et alimente ton Dashboard.",
      cta: "Ouvrir Training",
      icon: Layers,
      action: () => router.push("/learning/workspace"),
    },
  ] as const

  const totalSteps = onboardingSteps.length
  const completedCount = completedSteps.length
  const allDone = completedCount >= totalSteps

  const currentStepIndex = onboardingSteps.findIndex(
    step => !completedSteps.includes(step.id),
  )
  const currentStep =
    currentStepIndex === -1 ? onboardingSteps[0] : onboardingSteps[currentStepIndex]

  const toggleStepCompleted = (id: string) => {
    setCompletedSteps(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(s => s !== id) : [...prev, id]
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("onboarding_fr_steps", JSON.stringify(next))
        }
      } catch {
        // ignore
      }
      return next
    })
  }

  const markStepCompleted = (id: string) => {
    setCompletedSteps(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("onboarding_fr_steps", JSON.stringify(next))
        }
      } catch {
        // ignore
      }
      return next
    })
  }

  const handleStepAction = (id: string, action: () => void) => {
    markStepCompleted(id)
    action()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
        {/* Backend Status Alert */}
        {error && error.includes("Failed to fetch") && (
          <div className="mb-8 p-4 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="text-sm">
                <strong className="text-orange-800 dark:text-orange-200">Backend not available:</strong> Cannot connect
                to Flask server. Make sure your Flask backend is running on{" "}
                <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">http://127.0.0.1:5000</code>
              </div>
            </div>
          </div>
        )}

        <section className="animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
            {/* Left: hero copy */}
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                <span className="block">Welcome to</span>
                <span className="block text-primary">MemoMap</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Learn French with MemoMap, a tool that helps you learn language with multiple activities and AI assistant.
              </p>

              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    <p className="text-sm sm:text-base text-foreground">
                      Welcome back,{" "}
                      <span className="font-semibold">
                        {user?.name || "learner"}
                      </span>
                      !
                    </p>
                    <Link
                      href="/learning"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 font-medium"
                    >
                      Continue learning
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Sign in to start building your vocabulary, reviewing sessions, and tracking progress.
                    </p>
                    <LoginButton size="lg" />
                  </>
                )}
              </div>
            </div>

            {/* Right: feature overview card */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md border-none shadow-lg shadow-primary/5 bg-card/90 backdrop-blur">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Learning workspace
                  </div>
                  <CardTitle className="mt-3 text-lg">Everything you need in one place</CardTitle>
                  <CardDescription className="text-sm">
                    Jump back into your practice flow or explore a focused tool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <HomeRow
                      href="/learning/review-hub"
                      icon={Target}
                      label="Review Hub"
                      description="Run spaced‑repetition reviews for due vocabulary."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/vocab"
                      icon={BookOpen}
                      label="Vocabulary"
                      description="Browse, edit, and add cards to your deck."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/workspace"
                      icon={Layers}
                      label="Training"
                      description="Practice dictation and other guided activities."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/transcribe"
                      icon={Mic}
                      label="Transcribe"
                      description="Record, upload, and turn audio into transcripts."
                      active={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {isAuthenticated && lang === "fr" && (
          <section className="mt-12 md:mt-16 space-y-5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Onboarding · French
                </p>
                <h2 className="text-lg md:text-xl font-semibold">
                  Fais le tour de MemoMap étape par étape
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
                  Avance dans les étapes pour découvrir comment créer des sessions, construire ton vocabulaire,
                  utiliser l&apos;assistant IA, transcrire du contenu et t&apos;entraîner.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full border bg-background/80 px-3 py-1.5 text-[11px] md:text-xs">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">
                    Étape {Math.min(currentStepIndex === -1 ? totalSteps : currentStepIndex + 1, totalSteps)} / {totalSteps}
                  </span>
                  <div className="hidden sm:block w-32">
                    <Progress
                      value={(completedCount / totalSteps) * 100}
                      className="h-1.5"
                    />
                  </div>
                </div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  {completedCount}/{totalSteps}
                </span>
              </div>
            </div>

            {!allDone && currentStep && (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                {/* Current step card */}
                <Card className="border-primary/40 bg-card/90 shadow-md">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {currentStepIndex === -1 ? totalSteps : currentStepIndex + 1}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-primary/80">
                            Étape {currentStepIndex === -1 ? totalSteps : currentStepIndex + 1}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {(() => {
                              const Icon = currentStep.icon
                              return <Icon className="h-4 w-4 text-primary" />
                            })()}
                            <h3 className="text-sm md:text-base font-semibold">
                              {currentStep.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStepCompleted(currentStep.id)}
                        className="mt-0.5 inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-muted/60 transition"
                        aria-label={
                          completedSteps.includes(currentStep.id)
                            ? "Marquer comme non terminé"
                            : "Marquer comme terminé"
                        }
                      >
                        {completedSteps.includes(currentStep.id) ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs md:text-[13px] leading-relaxed text-muted-foreground">
                      {currentStep.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStepAction(currentStep.id, currentStep.action)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition"
                      >
                        {currentStep.cta}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        ~3–5 minutes pour cette étape
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Overview of all steps */}
                <Card className="border-dashed bg-card/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Vue d&apos;ensemble des étapes
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Tu peux cocher manuellement une étape si tu l&apos;as déjà explorée.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {onboardingSteps.map((step, index) => {
                      const Icon = step.icon
                      const done = completedSteps.includes(step.id)
                      const isCurrent =
                        currentStep && currentStep.id === step.id
                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[11px] md:text-xs transition",
                            done
                              ? "border-emerald-500/50 bg-emerald-500/5"
                              : "border-border/60 bg-muted/40 hover:border-primary/40",
                            isCurrent && "ring-1 ring-primary/40",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background text-[11px] font-medium">
                              {index + 1}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium">
                                {step.title}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              toggleStepCompleted(step.id)
                            }}
                            className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-emerald-600 hover:bg-background/80 transition"
                            aria-label={
                              done
                                ? "Marquer comme non terminé"
                                : "Marquer comme terminé"
                            }
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {allDone && (
              <Card className="border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Onboarding complété
                    </p>
                    <p className="text-sm md:text-base">
                      Tu as exploré les fonctionnalités clés de MemoMap. Continue sur le Dashboard pour suivre ton temps
                      et tes sessions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/learning")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs md:text-sm font-medium text-emerald-50 hover:bg-emerald-700 transition"
                  >
                    Ouvrir le Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

type HomeRowProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
  active?: boolean
}

function HomeRow({ href, icon: Icon, label, description, active }: HomeRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
        "hover:bg-muted/60 hover:border-primary/40",
        active && "border-primary bg-primary/5",
      )}
    >
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}
