"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LearningVocabCard } from "@/lib/types/learning-vocab"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import type { VocabStats } from "@/lib/types/learning-vocab"
import { useAuth } from "@/lib/contexts/auth-context"
import { Target, Play } from "lucide-react"
import { ReviewModal } from "@/components/learning/review/session-review-modal"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { REVIEW_CHALLENGES, type ReviewChallengeId } from "@/components/learning/review/challenges"

// Recent sessions section removed for a cleaner, focused Review Hub

export default function ReviewHub() {
  const { user } = useAuth()
  const { lang: selectedLanguage } = useLearningLang()
  const [dueCards, setDueCards] = useState<LearningVocabCard[]>([])
  const [reviewLimit, setReviewLimit] = useState<number>(10)
  const [reviewDirection, setReviewDirection] = useState<"word_to_translation" | "translation_to_word">("word_to_translation")
  const [challengePrefs, setChallengePrefs] = useState<Partial<Record<ReviewChallengeId, boolean>>>({})
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDue, setLoadingDue] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [slow, setSlow] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [sessionCards, setSessionCards] = useState<LearningVocabCard[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setLoadingDue(true)
    setLoadingStats(true)
    setSlow(false)
    const timer = setTimeout(() => setSlow(true), 1200)

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
        setLoadingDue(false)
      })

    // Fetch stats in parallel (does not block UI)
    learningVocabApi.stats(selectedLanguage)
      .then((s) => setStats(s))
      .catch(() => { /* optional */ })
      .finally(() => {
        setLoadingStats(false)
        clearTimeout(timer)
        setSlow(false)
      })
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
    if (dueCards.length > 0) {
      const shuffled = [...dueCards]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setSessionCards(shuffled)
      setShowReview(true)
    }
  }

  // No recent sessions list on Review Hub — keep users focused on today’s review.

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Review Hub</h1>
          <p className="text-muted-foreground">Clear today&apos;s due cards with focus.</p>
          {(loadingDue || loadingStats) && slow && (
            <p className="text-xs text-muted-foreground mt-1">Still loading data…</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Count dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Count</span>
            <Select value={String(reviewLimit)} onValueChange={(v) => setReviewLimit(parseInt(v))}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direction dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Direction</span>
            <Select
              value={reviewDirection}
              onValueChange={(value) =>
                setReviewDirection(
                  value === "translation_to_word" ? "translation_to_word" : "word_to_translation"
                )
              }
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="word_to_translation">Word → Translation</SelectItem>
                <SelectItem value="translation_to_word">Translation → Word</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Challenges dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Challenges</span>
            {(() => {
              const activeId =
                REVIEW_CHALLENGES.find(ch => challengePrefs[ch.id])?.id ?? "none"
              return (
                <Select
                  value={activeId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setChallengePrefs({})
                    } else {
                      setChallengePrefs({ [value as ReviewChallengeId]: true })
                    }
                  }}
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Select challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {REVIEW_CHALLENGES.map(challenge => (
                      <SelectItem key={challenge.id} value={challenge.id}>
                        {challenge.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Due Today - Primary CTA */}
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Due Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">
                {dueCards.length} cards ready for review
              </p>
              <p className="text-sm text-muted-foreground">
                {dueCards.length > 0 
                  ? "Spaced repetition algorithm has selected these cards for you"
                  : "No cards due today. Great job staying on top of your reviews!"
                }
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Limit: {reviewLimit}{stats ? ` • Total due: ${stats.due}` : ''}</p>
              {stats && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-md border p-2">Due <div className="text-base font-semibold">{stats.due}</div></div>
                  <div className="rounded-md border p-2">Overdue <div className="text-base font-semibold">{stats.overdue}</div></div>
                  <div className="rounded-md border p-2">New <div className="text-base font-semibold">{stats.new}</div></div>
                  <div className="rounded-md border p-2">Learning <div className="text-base font-semibold">{stats.learning}</div></div>
                </div>
              )}
            </div>
            <Button 
              size="lg" 
              onClick={handleStartReview}
              disabled={dueCards.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Start {reviewLimit}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Utility grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review Tip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Focus on today’s due cards to stay on track with spaced repetition.
            </p>
            <p className="text-xs">
              Pick a smaller count if you’re short on time—you can always come back for another batch.
            </p>
          </CardContent>
        </Card>
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
          {/* AI Assistant is globally mounted in learning layout */}
    </div>
  )
}
