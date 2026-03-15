"use client"

import { useCallback, useEffect, useState } from "react"
import type { LearningVocabCard, ReviewGrade } from "@/lib/types/learning-vocab"
import { Flashcard } from "@/components/learning/review/flashcard"
import { CardEditDrawer } from "@/components/learning/vocabulary/card-edit-drawer"
import { ReviewControls } from "@/components/learning/review/review-controls"
import { SubmitDialog } from "@/components/learning/review/submit-dialog"
import { REVIEW_CHALLENGES, type ReviewChallengeId } from "@/components/learning/review/challenges"

interface ReviewPlayerProps {
  language: string
  direction: "word_to_translation" | "translation_to_word"
  enabledChallenges?: ReviewChallengeId[]
  onComplete: (reviewedCount: number) => void
  onExit: () => void
  presetCards: LearningVocabCard[]
  maxWidthClass?: string
}

export function ReviewPlayer({
  language,
  direction,
  enabledChallenges = [],
  onComplete,
  onExit,
  presetCards,
  maxWidthClass = "max-w-4xl",
}: ReviewPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward")
  const [cardRenderKey, setCardRenderKey] = useState(0)
  type GradeMap = Record<string, ReviewGrade>
  const [reviewedMarks, setReviewedMarks] = useState<GradeMap>({})
  const reviewed = Object.keys(reviewedMarks).length

  // Local editable card state for optimistic updates during review
  const [cards, setCards] = useState<LearningVocabCard[]>(presetCards)
  useEffect(() => { setCards(presetCards) }, [presetCards])
  const currentCard = cards[currentIndex]
  const totalCards = cards.length
  const activeChallenges = REVIEW_CHALLENGES.filter(ch =>
    enabledChallenges.includes(ch.id)
  )

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setSlideDirection("forward")
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setCardRenderKey((prev) => prev + 1)
    } else {
      // At last card: open submit confirmation instead of exiting implicitly
      setShowConfirm(true)
    }
  }, [currentIndex, totalCards])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection("backward")
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
      setCardRenderKey((prev) => prev + 1)
    }
  }, [currentIndex])

  const handleMark = useCallback((quality: "again" | "hard" | "good" | "easy") => {
    const id = currentCard?.id
    if (id) {
      setReviewedMarks(prev => ({ ...prev, [id]: quality }))
    }
    handleNext()
  }, [currentCard?.id, handleNext])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (document.activeElement?.tagName === "INPUT" || 
          document.activeElement?.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement)?.isContentEditable) {
        return
      }

      if (e.code === "Space") {
        e.preventDefault()
        if (!isFlipped) {
          setIsFlipped(true)
        }
      } else if (isFlipped) {
         if (e.key === "1") handleMark("again")
         if (e.key === "2") handleMark("hard")
         if (e.key === "3") handleMark("good")
         if (e.key === "4") handleMark("easy")
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isFlipped, currentCard, handleMark]) // Re-bind when flip state or card changes

  if (!currentCard) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">No cards to review</p>
      </div>
    )
  }

  const progressPercent = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="absolute inset-x-0 top-0 z-20 h-px bg-slate-200/70">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Session
          </span>
          <span className="text-sm font-medium text-slate-700">
            {currentIndex + 1} / {totalCards}
          </span>
        </div>
        <button
          onClick={onExit}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Quitter
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-4 min-h-0 overflow-y-auto md:px-6">
        <div className="flex flex-1 flex-col items-center justify-center w-full">
          <div
            key={`${currentCard.id}-${cardRenderKey}`}
            className={`w-full animate-in duration-300 ${
              slideDirection === "forward" ? "slide-in-from-right-6" : "slide-in-from-left-6"
            } fade-in`}
          >
            <Flashcard
              card={currentCard}
              language={language}
              direction={direction}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              onInfo={() => setShowInfo(true)}
              maxWidthClass={maxWidthClass}
            />
          </div>
        </div>

        {activeChallenges.length > 0 && (
          <div className={`w-full ${maxWidthClass} mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {activeChallenges.map(challenge => (
              <challenge.Component
                key={challenge.id}
                card={currentCard}
                language={language}
              />
            ))}
          </div>
        )}
      </div>

      <div className="safe-area-bottom p-4 pt-0 md:px-6">
        <ReviewControls
          currentIndex={currentIndex}
          total={totalCards}
          isFlipped={isFlipped}
          onPrev={handlePrev}
          onNext={handleNext}
          onMark={handleMark}
          onSubmitClick={() => setShowConfirm(true)}
          onExit={onExit}
          onFlip={() => setIsFlipped(true)}
        />
      </div>

      <CardEditDrawer
        open={showInfo}
        onOpenChange={setShowInfo}
        card={currentCard}
        language={language}
        onCardUpdated={(updated) => setCards(prev => prev.map((c, idx) => idx === currentIndex ? { ...c, ...updated } : c))}
      />

      {/* Challenges Overlay removed */}

      <SubmitDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        reviewedMarks={reviewedMarks}
        currentIndex={currentIndex}
        cards={cards}
        reviewedCount={reviewed}
        language={language}
        onSubmitted={(count) => onComplete(count)}
      />
    </div>
  )
}
