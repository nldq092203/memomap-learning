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

  const [sessionFilter, setSessionFilter] = useState<"all" | "new" | "learning" | "review">("all")

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8 space-y-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header with Streak */}
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-3xl font-bold tracking-tight">Review Hub</h1>
             <p className="text-muted-foreground">Mission Control</p>
          </div>
        </div>

        {/* Filters / Segmented Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-2 rounded-xl border shadow-sm">
           
           {/* Limit Toggle */}
           <div className="flex items-center bg-muted rounded-lg p-1">
              {[10, 20, 50].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setReviewLimit(limit)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    reviewLimit === limit 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {limit}
                </button>
              ))}
           </div>

           {/* Stats / Session Filters */}
           <div className="flex items-center gap-2">
              <button
                onClick={() => setSessionFilter("new")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  sessionFilter === "new" 
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20" 
                    : "hover:bg-muted border-transparent"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">New</span>
                <span className="text-xs opacity-70 ml-1">{stats?.new || 0}</span>
              </button>

              <button
                onClick={() => setSessionFilter("learning")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  sessionFilter === "learning" 
                    ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300 ring-2 ring-orange-500/20" 
                    : "hover:bg-muted border-transparent"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm font-medium">Learning</span>
                <span className="text-xs opacity-70 ml-1">{stats?.learning || 0}</span>
              </button>

              <button
                onClick={() => setSessionFilter("review")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  sessionFilter === "review" 
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 ring-2 ring-green-500/20" 
                    : "hover:bg-muted border-transparent"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">To Review</span>
                <span className="text-xs opacity-70 ml-1">{stats?.overdue || 0}</span>
              </button>
           </div>
        </div>

        {/* Hero Section: Circular Progress */}
        <div className="relative flex flex-col items-center justify-center py-12">
           {/* SVG Circle */}
           <div className="relative w-64 h-64">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-muted/20"
                />
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                 <span className="text-6xl font-bold tracking-tighter leading-none">{dueCards.length}</span>
                 <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 font-medium">Due Cards</span>
              </div>
           </div>

           {/* CTA Button */}
           <div className="mt-8">
              <Button 
                size="lg" 
                className={`h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 transition-all w-full
                  ${dueCards.length > 0 ? "animate-pulse" : "opacity-50"}
                `}
                onClick={handleStartReview}
                disabled={dueCards.length === 0}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                REVIEW NOW
              </Button>
           </div>
           
           <p className="mt-4 text-sm text-muted-foreground">
             {dueCards.length === 0 ? "All caught up! Great job." : "Stay consistent to maintain your streak."}
           </p>
        </div>

        {/* Session Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Direction Control */}
           <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Direction</span>
              <Select
                value={reviewDirection}
                onValueChange={(value) =>
                  setReviewDirection(
                    value === "translation_to_word" ? "translation_to_word" : "word_to_translation"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word_to_translation">Word → Translation</SelectItem>
                  <SelectItem value="translation_to_word">Translation → Word</SelectItem>
                </SelectContent>
              </Select>
           </div>

           {/* Challenge Control */}
           <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Extra Challenge</span>
              <div className="flex items-center gap-2">
                 <Button
                   variant={challengePrefs["usage_sentence"] ? "default" : "outline"}
                   size="sm"
                   onClick={() => setChallengePrefs(prev => ({ ...prev, usage_sentence: !prev.usage_sentence }))}
                   className="gap-2"
                 >
                   {challengePrefs["usage_sentence"] && <Target className="h-4 w-4" />}
                   Make Sentences
                 </Button>
              </div>
           </div>
        </div>

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
