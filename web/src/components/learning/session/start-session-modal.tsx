"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type LearningLanguage, LEARNING_LANGS } from "@/lib/services/learning-api"
import { Play } from "lucide-react"
import { notificationService } from "@/lib/services/notification-service"
import { motion } from "framer-motion"
import { useLearningTimeSession } from "@/lib/contexts/learning-time-session-context"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"

const Motion = { div: motion.div }

export function StartSessionModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { startSession: startGlobalSession } = useLearningTimeSession()
  const { lang: globalLang, setLang: setGlobalLang } = useLearningLang()
  const [lang, setLang] = useState<LearningLanguage>(globalLang)
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<"timer" | "planned">("timer")
  const [planned, setPlanned] = useState<number>(25)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      setTitle("")
      setMode("timer")
      setPlanned(25)
      setLang(globalLang)
    }
  }, [open, globalLang])

  const handleStart = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      // Align global learning language with user selection.
      setGlobalLang(lang)
      // Start global learning time session (floating timer).
      startGlobalSession(
        title,
        mode === "planned" ? Math.max(1, planned) * 60 : null,
      )
      notificationService.success("Learning session started ✨")

      // Close modal; user stays on current page.
      onOpenChange(false)
    } catch (e: unknown) {
      // Keep modal open on failure so user can try again
      const errorMessage = e instanceof Error ? e.message : "Failed to start session. Please try again."
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg rounded-2xl border bg-background shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-6">
            <div className="mb-1 text-center text-2xl font-semibold">📘 Start a New Session</div>
            <div className="text-center text-sm text-muted-foreground">A quick ritual to begin learning.</div>
          </div>
          <div className="px-6 pb-6">
            {/* Language */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Language</div>
              <div className="inline-flex rounded-xl border bg-muted/30 p-1">
                {LEARNING_LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition focus-visible:ring-2 focus-visible:ring-primary/40",
                      lang === l 
                        ? "bg-primary text-primary-foreground shadow-sm font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    aria-pressed={lang===l}
                  >
                    <span className="mr-1" aria-hidden>{l === "fr" ? "🇫🇷" : "🇬🇧"}</span>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Title</span>
                <span className="text-xs text-muted-foreground">{title.length}/200</span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                placeholder="e.g., Conversation practice, podcast notes..."
                aria-label="Session title"
                className="bg-background/60"
              />
              {error && <div className="text-xs text-destructive">{error}</div>}
              <div className="text-xs text-muted-foreground">Optional, max 200 chars</div>
            </div>

            {/* Duration */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("timer")}
                className={cn(
                  "rounded-xl border p-3 text-left transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                  mode === "timer" && "ring-2 ring-primary/40"
                )}
                aria-pressed={mode === "timer"}
              >
                <div className="text-sm font-medium">⏱ Live timer</div>
                <div className="text-xs text-muted-foreground">Start now, we’ll track elapsed time</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("planned")}
                className={cn(
                  "rounded-xl border p-3 text-left transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                  mode === "planned" && "ring-2 ring-primary/40"
                )}
                aria-pressed={mode === "planned"}
              >
                <div className="text-sm font-medium">🗓 Planned</div>
                <div className="text-xs text-muted-foreground">Set a target duration</div>
                <div className="mt-3 inline-flex items-center gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Decrease minutes"
                    onClick={(e) => { e.stopPropagation(); setPlanned(Math.max(1, planned - 5)) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setPlanned(Math.max(1, planned - 5)) } }}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-sm cursor-pointer select-none"
                  >
                    -
                  </span>
                  <Input type="number" min={1} value={planned} onChange={(e) => { e.stopPropagation(); setPlanned(Math.max(1, Number(e.target.value))) }} className="w-20 h-8" disabled={mode!=="planned"} aria-label="Planned minutes" />
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Increase minutes"
                    onClick={(e) => { e.stopPropagation(); setPlanned(planned + 5) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setPlanned(planned + 5) } }}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-sm cursor-pointer select-none"
                  >
                    +
                  </span>
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 border-t pt-5">
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-6">Cancel</Button>
                <Button onClick={handleStart} disabled={isSubmitting} className="px-6 min-w-[180px] shadow-sm hover:shadow-md">
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Starting..." : "Start Session"}
                </Button>
              </div>
            </div>
          </div>
        </Motion.div>
      </div>
    </Motion.div>
  )
}
