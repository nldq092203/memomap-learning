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

export function ReviewControls({ currentIndex, isFlipped, onPrev, onMark, onSubmitClick, onFlip }: ReviewControlsProps) {
  if (!isFlipped) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-full border border-white/70 bg-white/85 text-base font-semibold text-slate-800 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.28)] backdrop-blur transition-transform active:scale-[0.99]"
          onClick={onFlip}
        >
          Voir la réponse <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-500">Espace</span>
        </Button>
        {currentIndex > 0 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={onPrev} className="text-muted-foreground">
              <ChevronLeft className="mr-1 h-4 w-4" /> Revenir
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ControlButton
          shortcut="1"
          label="Encore"
          subLabel="< 1 min"
          colorClass="border-rose-200/80 bg-rose-50/70 text-rose-700 hover:bg-rose-100/80"
          onClick={() => onMark("again")}
        />
        <ControlButton
          shortcut="2"
          label="Difficile"
          subLabel="2 j"
          colorClass="border-amber-200/80 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80"
          onClick={() => onMark("hard")}
        />
        <ControlButton
          shortcut="3"
          label="Bien"
          subLabel="4 j"
          colorClass="border-emerald-200/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/80"
          onClick={() => onMark("good")}
        />
        <ControlButton
          shortcut="4"
          label="Facile"
          subLabel="7 j"
          colorClass="border-sky-200/80 bg-sky-50/70 text-sky-700 hover:bg-sky-100/80"
          onClick={() => onMark("easy")}
        />
      </div>

      <div className="flex items-center justify-center">
        <Button variant="ghost" size="sm" onClick={currentIndex > 0 ? onPrev : undefined} disabled={currentIndex === 0} className="mr-4 text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Revenir
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onSubmitClick} className="ml-4 text-muted-foreground">
          Terminer
        </Button>
      </div>
    </div>
  )
}

function ControlButton({ 
  shortcut, 
  label, 
  subLabel, 
  colorClass, 
  onClick 
}: { 
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
        relative flex h-24 flex-col justify-between overflow-hidden rounded-[24px] border px-4 py-4 text-left
        shadow-[0_16px_40px_-28px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-200
        active:scale-[0.98] hover:-translate-y-0.5
        ${colorClass}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-semibold leading-none sm:text-lg">{label}</div>
        <div className="rounded-full border border-current/10 bg-white/65 px-2.5 py-1 text-[11px] font-mono font-bold shadow-sm">
          {shortcut}
        </div>
      </div>
      <div className="text-xs font-medium opacity-80">{subLabel}</div>
    </button>
  )
}
