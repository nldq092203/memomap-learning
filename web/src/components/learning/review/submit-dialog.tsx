"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { LearningVocabCard, ReviewGrade } from "@/lib/types/learning-vocab"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { useState } from "react"

interface SubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewedMarks: Record<string, ReviewGrade>
  currentIndex: number
  cards: LearningVocabCard[]
  reviewedCount: number
  language: string
  onSubmitted: (reviewedCount: number) => void
}

export function SubmitDialog({ open, onOpenChange, reviewedMarks, currentIndex, cards, reviewedCount, language, onSubmitted }: SubmitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!isSubmitting) onOpenChange(open) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Review Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{cards.length}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Reviewed</div>
              <div className="text-lg font-semibold text-primary">{reviewedCount}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="text-lg font-semibold">{Math.max(0, cards.length - reviewedCount)}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="text-lg font-semibold">{Math.min(currentIndex + 1, Math.max(1, cards.length))}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["again","hard","good","easy"] as const).map(g => {
              const count = Object.values(reviewedMarks).filter(x => x === g).length
              return (
                <div key={g} className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground capitalize">{g}</div>
                  <div className="text-lg font-semibold">{count}</div>
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Word</th>
                    <th className="px-3 py-2">Translation</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c, idx) => {
                    const grade = reviewedMarks[c.id]
                    const status = idx < currentIndex || grade ? "Reviewed" : "Pending"
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{c.word}</td>
                        <td className="px-3 py-2">{c.translation ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            status === "Reviewed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                          }`}>{status}</span>
                        </td>
                        <td className="px-3 py-2 capitalize">{grade ?? "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="default"
            disabled={isSubmitting}
            onClick={async () => {
              try {
                setIsSubmitting(true)
                const entries = Object.entries(reviewedMarks) as Array<[string, ReviewGrade]>
                if (entries.length > 0) {
                  const reviews = entries.map(([id, grade]) => ({
                    card_id: id,
                    grade,
                  }))
                  await learningVocabApi.reviewBatch(reviews)
                }
              } catch (e) {
                console.error('Failed to submit review batch', e)
              } finally {
                setIsSubmitting(false)
                onOpenChange(false)
                onSubmitted(reviewedCount)
              }
            }}
          >
            {isSubmitting ? 'Submitting…' : 'Confirm Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
