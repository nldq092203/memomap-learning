"use client"

import { Progress } from "@/components/ui/progress"
import type { ReactNode } from "react"

interface ReviewProgressProps {
  currentIndex: number
  total: number
  reviewed: number
  right?: ReactNode
}

export function ReviewProgress({ currentIndex, total, reviewed, right }: ReviewProgressProps) {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0
  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 px-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Card {Math.min(currentIndex + 1, Math.max(1, total))} of {total || 0}
        </span>
        {right ?? (<span className="font-semibold text-primary">Reviewed: {reviewed}</span>)}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}
