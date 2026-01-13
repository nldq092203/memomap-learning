"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ReviewGrade } from "@/lib/types/learning-vocab"

interface ReviewControlsProps {
  currentIndex: number
  total: number
  isFlipped: boolean
  onPrev: () => void
  onNext: () => void
  onMark: (grade: ReviewGrade) => void
  onSubmitClick: () => void
  onExit: () => void
}

export function ReviewControls({ currentIndex, total, isFlipped, onPrev, onNext, onMark, onSubmitClick, onExit }: ReviewControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={currentIndex === 0} className="gap-2 bg-transparent">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={currentIndex === total - 1} className="gap-2 bg-transparent">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => onMark("again")} className="text-xs sm:text-sm">Again</Button>
          <Button variant="outline" onClick={() => onMark("hard")} className="text-xs sm:text-sm">Hard</Button>
          <Button variant="outline" onClick={() => onMark("good")} className="text-xs sm:text-sm">Good</Button>
          <Button variant="default" onClick={() => onMark("easy")} className="text-xs sm:text-sm">Easy</Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onSubmitClick} className="px-4">Submit Now</Button>
        <Button variant="ghost" onClick={onExit} className="text-muted-foreground hover:text-foreground">Exit Review</Button>
      </div>
    </div>
  )
}
