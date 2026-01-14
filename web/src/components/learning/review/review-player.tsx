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
  }, [isFlipped, currentCard]) // Re-bind when flip state or card changes

  if (!currentCard) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">No cards to review</p>
      </div>
    )
  }

  // Calculate segments for progress bar
  const segments = Array.from({ length: totalCards }).map((_, i) => {
    if (i < currentIndex) return "completed"
    if (i === currentIndex) return "current"
    return "upcoming"
  })

  // Zen Mode Layout
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
       {/* Top Bar: Progress & Exit */}
       <div className="h-14 flex items-center justify-between px-4 border-b">
          <div className="flex-1 flex gap-1 h-1.5 mx-4 max-w-md">
             {segments.map((status, i) => (
               <div 
                 key={i} 
                 className={`flex-1 rounded-full transition-all duration-300 ${
                   status === "completed" ? "bg-primary" :
                   status === "current" ? "bg-primary/40" :
                   "bg-muted"
                 }`}
               />
             ))}
          </div>
          <button 
            onClick={onExit}
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1 rounded-md hover:bg-muted transition-colors"
          >
            Exit
          </button>
       </div>

       {/* Main Content: Flashcard & Challenges */}
       <div className="flex-1 flex flex-col items-center justify-start p-4 min-h-0 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
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

          {/* Integrated Challenges */}
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

       {/* Bottom Controls */}
       <div className="p-4 safe-area-bottom pt-0">
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
