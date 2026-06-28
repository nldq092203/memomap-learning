"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LearningVocabCard } from "@/lib/types/learning-vocab"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import type { VocabStats } from "@/lib/types/learning-vocab"
import { useAuth } from "@/lib/contexts/auth-context"
import { BookOpen, Sparkles, Play } from "lucide-react"
import { ReviewModal } from "@/components/learning/review/session-review-modal"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { REVIEW_CHALLENGES, type ReviewChallengeId } from "@/components/learning/review/challenges"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { VocabShortcutHint } from "@/components/learning/vocabulary/vocab-shortcut-hint"

// Recent sessions section removed for a cleaner, focused Review Hub

function ReviewHubContent() {
  const { user } = useAuth()
  const { lang: selectedLanguage } = useLearningLang()
  const [dueCards, setDueCards] = useState<LearningVocabCard[]>([])
  const [reviewLimit, setReviewLimit] = useState<number>(10)
  const [reviewDirection, setReviewDirection] = useState<"word_to_translation" | "translation_to_word">("word_to_translation")
  const [challengePrefs, setChallengePrefs] = useState<Partial<Record<ReviewChallengeId, boolean>>>({})
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReview, setShowReview] = useState(false)
  const [sessionCards, setSessionCards] = useState<LearningVocabCard[]>([])

  const [sessionFilter, setSessionFilter] = useState<"all" | "new" | "learning" | "review">("all")

  const newCount = stats?.new || 0
  const learningCount = stats?.learning || 0
  const reviewCount = stats?.overdue || 0
  const totalTrackedCards = newCount + learningCount + reviewCount
  const stackedSegments = [
    {
      key: "new" as const,
      label: "Nouvelles",
      value: newCount,
      barClass: "bg-[var(--vintage-soft-sandstone)]",
      textClass: "text-[var(--vintage-ink)]",
      ringClass: "ring-[var(--vintage-soft-sandstone)]/40",
    },
    {
      key: "learning" as const,
      label: "En cours",
      value: learningCount,
      barClass: "bg-[var(--vintage-desert-rock)]/70",
      textClass: "text-[var(--vintage-ink)]",
      ringClass: "ring-[var(--vintage-desert-rock)]/20",
    },
    {
      key: "review" as const,
      label: "A revoir",
      value: reviewCount,
      barClass: "bg-[var(--vintage-desert-rock)]",
      textClass: "text-[var(--vintage-ink)]",
      ringClass: "ring-[var(--vintage-desert-rock)]/30",
    },
  ]

  useEffect(() => {
    if (!user) return
    setLoading(true)

    // Fetch due first — it enables the primary action quickly
    learningVocabApi.due(selectedLanguage, reviewLimit)
      .then((dueCardsData) => {
        setDueCards(dueCardsData.cards)
      })
      .catch((error) => {
        console.error('Failed to load due cards:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    // Fetch stats in parallel (does not block UI)
    learningVocabApi.stats(selectedLanguage)
      .then((s) => setStats(s))
      .catch(() => { /* optional */ })
      .finally(() => {})
  }, [user, selectedLanguage, reviewLimit])

  // Load saved preferences (count), language comes from shared context
  useEffect(() => {
    try {
      const savedLimit = localStorage.getItem('review_limit')
      if (savedLimit) setReviewLimit(parseInt(savedLimit) || 10)
      const savedDirection = localStorage.getItem('review_direction') as
        | "word_to_translation"
        | "translation_to_word"
        | null
      if (savedDirection === "word_to_translation" || savedDirection === "translation_to_word") {
        setReviewDirection(savedDirection)
      }
      const challengesKey = "review_challenges_v1"
      const rawChallenges = localStorage.getItem(challengesKey)
      if (rawChallenges) {
        const parsed = JSON.parse(rawChallenges) as Partial<Record<ReviewChallengeId, boolean>>
        setChallengePrefs(parsed)
      } else {
        // Legacy single toggle support (pre-v1)
        const legacy = localStorage.getItem("review_challenge")
        if (legacy === "on") {
          setChallengePrefs({ usage_sentence: true })
        }
      }
    } catch { /* noop */ }
  }, [])

  // Persist preferences (count only)
  useEffect(() => {
    try {
      localStorage.setItem('review_limit', String(reviewLimit))
    } catch { /* noop */ }
  }, [reviewLimit])

  useEffect(() => {
    try {
      localStorage.setItem('review_direction', reviewDirection)
    } catch { /* noop */ }
  }, [reviewDirection])

  useEffect(() => {
    try {
      localStorage.setItem('review_challenges_v1', JSON.stringify(challengePrefs))
    } catch { /* noop */ }
  }, [challengePrefs])

  const handleStartReview = async () => {
    let cardsToReview = [...dueCards]
    
    // Apply status filter if not "all"
    if (sessionFilter !== "all") {
       // Filter logic: match card status
       // Note: 'review' stats usually map to 'review' or 'relearning' status. 
       // We'll assume 'new' -> new, 'learning' -> learning, 'review' -> everything else (review, relearning)
       cardsToReview = cardsToReview.filter(c => {
         if (sessionFilter === "new") return c.status === "new"
         if (sessionFilter === "learning") return c.status === "learning"
         if (sessionFilter === "review") return c.status !== "new" && c.status !== "learning"
         return true
       })
    }

    if (cardsToReview.length > 0) {
      // Shuffle
      const shuffled = [...cardsToReview]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setSessionCards(shuffled)
      setShowReview(true)
    }
  }

  // Calculate circular progress
  const maxDue = stats?.due || 1
  const currentDue = dueCards.length
  // Ensure we don't divide by zero and clamp
  const progressPercent = Math.min(100, Math.max(0, (currentDue / (maxDue || 1)) * 100))
  // Circle config
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference
  const directionOptions = [
    { id: "word_to_translation" as const, label: "Mot -> Traduction" },
    { id: "translation_to_word" as const, label: "Traduction -> Mot" },
  ]
  const filteredCount = sessionFilter === "all"
    ? dueCards.length
    : dueCards.filter((card) => {
        if (sessionFilter === "new") return card.status === "new"
        if (sessionFilter === "learning") return card.status === "learning"
        if (sessionFilter === "review") return card.status !== "new" && card.status !== "learning"
        return true
      }).length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5eee5]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--vintage-desert-rock)]"></div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f5eee5] px-4 py-4 md:px-6 md:py-6"
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(245,238,229,0.94), rgba(245,238,229,0.98)), url('/UI/map.png')",
        backgroundPosition: "center top",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <section className="rounded-[28px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 p-5 shadow-[0_18px_42px_rgba(74,51,35,0.08)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-[2rem]">
                  Révisions vocabulaire
                </h1>
                <p className="max-w-xl text-sm leading-6 text-[var(--vintage-muted-ink)]">
                  Lancez vos cartes SRS, puis gérez votre liste de mots quand vous en avez besoin.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
                <VocabShortcutHint />

                <Link
                  href="/learning/vocab"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 text-sm font-semibold text-[var(--vintage-ink)] transition-colors hover:bg-[var(--vintage-cream)]"
                >
                  <BookOpen className="h-4 w-4" />
                  Voir le vocabulaire
                </Link>

                <div className="rounded-2xl border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-muted-ink)]">
                    <span>Volume</span>
                    <span>{reviewLimit} cartes</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--vintage-feather-white)] p-1 shadow-sm">
                    {[10, 20, 50].map((limit) => (
                      <button
                        key={limit}
                        onClick={() => setReviewLimit(limit)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          reviewLimit === limit
                            ? "bg-[var(--vintage-desert-rock)] text-white shadow-sm"
                            : "text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)] hover:text-[var(--vintage-ink)]"
                        }`}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px] xl:items-start">
              <div className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)]/70 p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--vintage-ink)]">Répartition des cartes</p>
                    <p className="text-sm text-[var(--vintage-muted-ink)]">Nouveaux mots, apprentissage et cartes à revoir.</p>
                  </div>
                  <button
                    onClick={() => setSessionFilter("all")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      sessionFilter === "all"
                        ? "bg-[var(--vintage-desert-rock)] text-white"
                        : "bg-[var(--vintage-feather-white)] text-[var(--vintage-muted-ink)] shadow-sm hover:text-[var(--vintage-ink)]"
                    }`}
                  >
                    Toutes
                  </button>
                </div>

                <div className="overflow-hidden rounded-full bg-[var(--vintage-soft-sandstone)]/40">
                  <div className="flex h-4 w-full">
                    {stackedSegments.map((segment) => {
                      const width = totalTrackedCards > 0 ? (segment.value / totalTrackedCards) * 100 : 0
                      return (
                        <div
                          key={segment.key}
                          className={`${segment.barClass} transition-[width] duration-500`}
                          style={{ width: `${width}%` }}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {stackedSegments.map((segment) => {
                    const isActive = sessionFilter === segment.key
                    return (
                      <button
                        key={segment.key}
                        onClick={() => setSessionFilter(segment.key)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? `border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-sm ring-1 ${segment.ringClass}`
                            : "border-transparent bg-[var(--vintage-feather-white)]/70 hover:border-[var(--vintage-soft-sandstone)] hover:bg-[var(--vintage-feather-white)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${segment.barClass}`} />
                          <span className="text-sm font-semibold text-[var(--vintage-ink)]">{segment.label}</span>
                        </div>
                        <p className={`mt-2 text-sm font-medium ${segment.textClass}`}>{segment.value}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)]/60 px-5 py-5 text-center shadow-sm">
                <div className="relative flex h-56 w-56 items-center justify-center md:h-60 md:w-60">
                  <div className="absolute inset-10 animate-pulse rounded-full bg-[var(--vintage-cream)] blur-xl" />
                  <svg className="relative h-full w-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="18"
                      fill="transparent"
                      className="text-[var(--vintage-soft-sandstone)]/50"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="18"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="text-[var(--vintage-desert-rock)] transition-all duration-1000 ease-out"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-6xl font-bold leading-none tracking-[-0.04em] text-[var(--vintage-ink)] md:text-7xl">
                      {dueCards.length}
                    </span>
                    <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--vintage-muted-ink)]">
                      Cartes prêtes
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full max-w-sm space-y-3">
                  <Button
                    size="lg"
                    className={`h-14 w-full rounded-full bg-[var(--vintage-desert-rock)] text-base font-bold text-white shadow-sm transition hover:bg-[#8f7763] ${
                      dueCards.length > 0 ? "" : "opacity-60 saturate-50"
                    }`}
                    onClick={handleStartReview}
                    disabled={dueCards.length === 0}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Commencer la révision
                  </Button>
                  <p className="text-sm text-[var(--vintage-muted-ink)]">
                    {dueCards.length === 0
                      ? "Aucune carte urgente pour le moment."
                      : `${filteredCount} carte${filteredCount > 1 ? "s" : ""} correspondent au filtre actif.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)]/70 p-5 md:p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--vintage-ink)]">Paramètres de session</p>
                    <p className="mt-1 text-sm text-[var(--vintage-muted-ink)]">
                      Ajustez le sens des cartes et activez un défi d’expression sans quitter votre flux.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-muted-ink)]">
                      Direction
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {directionOptions.map((option) => {
                        const isActive = reviewDirection === option.id
                        return (
                          <button
                            key={option.id}
                            onClick={() => setReviewDirection(option.id)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              isActive
                                ? "border-[var(--vintage-desert-rock)]/30 bg-[var(--vintage-feather-white)] text-[var(--vintage-desert-rock)] shadow-sm ring-1 ring-[var(--vintage-desert-rock)]/15"
                                : "border-transparent bg-[var(--vintage-feather-white)]/75 text-[var(--vintage-muted-ink)] hover:border-[var(--vintage-soft-sandstone)] hover:text-[var(--vintage-ink)]"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] px-4 py-4 shadow-sm lg:min-w-[250px]">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[var(--vintage-cream)] p-2 text-[var(--vintage-desert-rock)]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--vintage-ink)]">Défi supplémentaire</p>
                        <p className="text-sm text-[var(--vintage-muted-ink)]">Ajoutez une phrase d’usage pendant la révision.</p>
                      </div>
                      <button
                        onClick={() =>
                          setChallengePrefs((prev) => ({
                            ...prev,
                            usage_sentence: !prev.usage_sentence,
                          }))
                        }
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          challengePrefs["usage_sentence"]
                            ? "bg-[var(--vintage-desert-rock)] text-white shadow-sm"
                            : "bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-cream)]"
                        }`}
                      >
                        {challengePrefs["usage_sentence"] ? "Activé : phrase d’usage" : "Activer la phrase d’usage"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ReviewModal
        isOpen={showReview}
        vocabCards={sessionCards}
        language={selectedLanguage || "fr"}
        direction={reviewDirection}
        enabledChallenges={REVIEW_CHALLENGES.map(ch => ch.id).filter(id => challengePrefs[id])}
        onComplete={async () => {
          try {
            const dueCardsData = await learningVocabApi.due(selectedLanguage, reviewLimit)
            setDueCards(dueCardsData.cards)
            const s = await learningVocabApi.stats(selectedLanguage)
            setStats(s)
          } catch {
            /* ignore */
          }
        }}
        onOpenChange={setShowReview}
      />
    </div>
  )
}

export default function ReviewHub() {
  return (
    <ProtectedRoute>
      <ReviewHubContent />
    </ProtectedRoute>
  )
}
