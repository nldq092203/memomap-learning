"use client"

import { useEffect, useState } from "react"
import type { LearningVocabCard, ReviewGrade } from "@/lib/types/learning-vocab"
import { ReviewProgress } from "@/components/learning/review/review-progress"
import { Flashcard } from "@/components/learning/review/flashcard"
import { CardEditDrawer } from "@/components/learning/vocabulary/card-edit-drawer"
import { ReviewControls } from "@/components/learning/review/review-controls"
import { SubmitDialog } from "@/components/learning/review/submit-dialog"
import { FloatingWindow } from "@/components/ui/floating-windows"
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

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    } else {
      // At last card: open submit confirmation instead of exiting implicitly
      setShowConfirm(true)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleMark = (quality: "again" | "hard" | "good" | "easy") => {
    const id = currentCard?.id
    if (id) {
      setReviewedMarks(prev => ({ ...prev, [id]: quality }))
    }
    handleNext()
  }

  if (!currentCard) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">No cards to review</p>
      </div>
    )
  }

  return (
    <FloatingWindow
      id="review-session-window"
      title={`Card ${currentIndex + 1} of ${totalCards}`}
      persistKey="review-session-window"
      defaultWidth={960}
      defaultHeight={640}
      defaultX={64}
      defaultY={48}
      onClose={onExit}
    >
    <div className="relative flex flex-col gap-4 p-4 sm:p-6">
      <ReviewProgress
        currentIndex={currentIndex}
        total={totalCards}
        reviewed={reviewed}
        right={(
          <span className="font-semibold text-primary">Reviewed: {reviewed}</span>
        )}
      />

      <Flashcard
        card={currentCard}
        language={language}
        direction={direction}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(!isFlipped)}
        onInfo={() => setShowInfo(true)}
        maxWidthClass={maxWidthClass}
      />
      <CardEditDrawer
        open={showInfo}
        onOpenChange={setShowInfo}
        card={currentCard}
        language={language}
        onCardUpdated={(updated) => setCards(prev => prev.map((c, idx) => idx === currentIndex ? { ...c, ...updated } : c))}
      />

      <ReviewControls
        currentIndex={currentIndex}
        total={totalCards}
        isFlipped={isFlipped}
        onPrev={handlePrev}
        onNext={handleNext}
        onMark={handleMark}
        onSubmitClick={() => setShowConfirm(true)}
        onExit={onExit}
      />

      {activeChallenges.length > 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Challenges
          </p>
          {activeChallenges.map(challenge => (
            <challenge.Component
              key={challenge.id}
              card={currentCard}
              language={language}
            />
          ))}
        </div>
      )}

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
    </FloatingWindow>
  )
}
