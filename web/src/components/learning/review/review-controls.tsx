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
  onFlip?: () => void
}

export function ReviewControls({ currentIndex, total, isFlipped, onPrev, onNext, onMark, onSubmitClick, onExit, onFlip }: ReviewControlsProps) {
  if (!isFlipped) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <Button 
          size="lg" 
          className="w-full h-16 text-xl font-semibold rounded-xl shadow-lg transition-transform active:scale-95"
          onClick={onFlip}
        >
          Show Answer <span className="ml-2 text-xs opacity-60 font-mono">[Space]</span>
        </Button>
        {currentIndex > 0 && (
           <div className="flex justify-center">
             <Button variant="ghost" size="sm" onClick={onPrev} className="text-muted-foreground">
               <ChevronLeft className="h-4 w-4 mr-1" /> Undo
             </Button>
           </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
       <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <ControlButton 
             grade="again" 
             shortcut="1" 
             label="Again" 
             subLabel="< 1m" 
             colorClass="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
             onClick={() => onMark("again")}
          />
          <ControlButton 
             grade="hard" 
             shortcut="2" 
             label="Hard" 
             subLabel="2d" 
             colorClass="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900"
             onClick={() => onMark("hard")}
          />
          <ControlButton 
             grade="good" 
             shortcut="3" 
             label="Good" 
             subLabel="4d" 
             colorClass="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900"
             onClick={() => onMark("good")}
          />
          <ControlButton 
             grade="easy" 
             shortcut="4" 
             label="Easy" 
             subLabel="7d" 
             colorClass="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
             onClick={() => onMark("easy")}
          />
       </div>

       <div className="flex items-center justify-center">
          <Button variant="ghost" size="sm" onClick={currentIndex > 0 ? onPrev : undefined} disabled={currentIndex === 0} className="text-muted-foreground mr-4">
             <ChevronLeft className="h-4 w-4 mr-1" /> Undo
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={onSubmitClick} className="ml-4 text-muted-foreground">
             Submit
          </Button>
       </div>
    </div>
  )
}

function ControlButton({ 
  grade, 
  shortcut, 
  label, 
  subLabel, 
  colorClass, 
  onClick 
}: { 
  grade: string, 
  shortcut: string, 
  label: string, 
  subLabel: string, 
  colorClass: string, 
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center h-20 sm:h-24 rounded-xl border-2 transition-all duration-200
        active:scale-95 hover:shadow-md
        ${colorClass}
      `}
    >
      <div className="text-lg sm:text-xl font-bold">{label}</div>
      <div className="text-xs opacity-70 font-medium">{subLabel}</div>
      <div className="mt-1 text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">
        {shortcut}
      </div>
    </button>
  )
}
