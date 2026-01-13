"use client"

import { useEffect } from "react"
import { ReviewPlayer } from "@/components/learning/review/review-player"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import type { ReviewChallengeId } from "@/components/learning/review/challenges"

interface ReviewModalProps {
  isOpen: boolean
  vocabCards: LearningVocabCard[]
  language: string
  direction?: "word_to_translation" | "translation_to_word"
  enabledChallenges?: ReviewChallengeId[]
  onComplete: (reviewedCount: number) => void
  onOpenChange: (open: boolean) => void
}

export function ReviewModal({
  isOpen,
  vocabCards,
  language,
  direction = "word_to_translation",
  enabledChallenges = [],
  onComplete,
  onOpenChange,
}: ReviewModalProps) {
  useEffect(() => {
    try {
      window.dispatchEvent(new Event(isOpen ? 'learning-review-open' : 'learning-review-close'))
    } catch {}
    return () => {
      try { window.dispatchEvent(new Event('learning-review-close')) } catch {}
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close the whole review session if the user is typing
        // in an input/textarea/contentEditable (e.g. AI challenges).
        try {
          const active = document.activeElement as HTMLElement | null
          if (
            active &&
            (active.tagName === "INPUT" ||
              active.tagName === "TEXTAREA" ||
              active.isContentEditable)
          ) {
            return
          }
        } catch {
          // ignore – fall through to default behavior
        }
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onOpenChange])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40" />
      <ReviewPlayer
        language={language}
        direction={direction}
        enabledChallenges={enabledChallenges}
        onComplete={(reviewedCount) => {
          onComplete(reviewedCount)
          onOpenChange(false)
        }}
        onExit={() => onOpenChange(false)}
        presetCards={vocabCards}
        maxWidthClass="max-w-5xl"
      />
    </>
  )
}
