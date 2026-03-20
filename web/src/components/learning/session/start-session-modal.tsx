"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Clock3, Play, TimerReset } from "lucide-react"
import { notificationService } from "@/lib/services/notification-service"
import { motion } from "framer-motion"
import { useLearningTimeSession } from "@/lib/contexts/learning-time-session-context"
import { useAsyncAction } from "@/lib/hooks/use-async-action"

const Motion = { div: motion.div }

export function StartSessionModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { startSession: startGlobalSession } = useLearningTimeSession()
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<"timer" | "planned">("timer")
  const [planned, setPlanned] = useState<number>(25)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      setTitle("")
      setMode("timer")
      setPlanned(25)
    }
  }, [open])

  const { isPending: isSubmitting, run: handleStart } = useAsyncAction(async () => {
    setError(null)
    try {
      startGlobalSession(
        title,
        mode === "planned" ? Math.max(1, planned) * 60 : null,
      )
      notificationService.success("Session démarrée ✨")

      // Close modal; user stays on current page.
      onOpenChange(false)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Impossible de démarrer la session. Réessayez."
      setError(errorMessage)
    }
  })

  if (!open) return null

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { if (!isSubmitting) onOpenChange(false) }} />
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={() => { if (!isSubmitting) onOpenChange(false) }}
      >
        <Motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-xl rounded-[24px] border border-border/70 bg-background shadow-[0_28px_70px_-34px_rgba(15,23,42,0.35)]"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border/60 px-5 py-5 sm:px-6">
            <div className="mb-1 text-xl font-semibold sm:text-2xl">Nouvelle session</div>
            <div className="text-sm text-muted-foreground">
              Choisissez votre rythme puis lancez votre temps d&apos;apprentissage.
            </div>
          </div>
          <div className="px-5 pb-6 pt-5 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("timer")}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30",
                  "min-h-[168px] bg-gradient-to-br from-background to-muted/30 hover:border-primary/40 hover:shadow-md",
                  mode === "timer" &&
                    "border-[2px] border-primary shadow-[0_0_0_4px_rgba(41,171,135,0.12),0_18px_40px_-28px_rgba(41,171,135,0.6)]",
                )}
                aria-pressed={mode === "timer"}
              >
                <div className="flex h-full flex-col">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="text-base font-semibold">Chrono libre</div>
                    <div className="text-sm leading-6 text-muted-foreground">
                      Démarrez maintenant. Le temps s&apos;enregistre au fil de votre session.
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("planned")}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30",
                  "min-h-[168px] bg-gradient-to-br from-background to-muted/30 hover:border-primary/40 hover:shadow-md",
                  mode === "planned" &&
                    "border-[2px] border-primary shadow-[0_0_0_4px_rgba(41,171,135,0.12),0_18px_40px_-28px_rgba(41,171,135,0.6)]",
                )}
                aria-pressed={mode === "planned"}
              >
                <div className="flex h-full flex-col">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <TimerReset className="h-5 w-5" />
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="text-base font-semibold">Session planifiée</div>
                    <div className="text-sm leading-6 text-muted-foreground">
                      Fixez une durée cible pour garder un cadre simple.
                    </div>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Réduire les minutes"
                      onClick={(e) => { e.stopPropagation(); setPlanned(Math.max(1, planned - 5)) }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPlanned(Math.max(1, planned - 5)) } }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm font-medium cursor-pointer select-none"
                    >
                      -
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={planned}
                      onChange={(e) => { e.stopPropagation(); setPlanned(Math.max(1, Number(e.target.value))) }}
                      className="h-10 w-24 rounded-full border-border/80 text-center"
                      disabled={mode !== "planned"}
                      aria-label="Minutes prévues"
                    />
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Augmenter les minutes"
                      onClick={(e) => { e.stopPropagation(); setPlanned(planned + 5) }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPlanned(planned + 5) } }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm font-medium cursor-pointer select-none"
                    >
                      +
                    </span>
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleStart}
                loading={isSubmitting}
                className="h-13 min-h-[56px] w-full rounded-full px-6 text-base font-semibold shadow-[0_18px_40px_-24px_rgba(41,171,135,0.7)] transition-shadow hover:shadow-[0_22px_45px_-22px_rgba(41,171,135,0.8)]"
              >
                {!isSubmitting && <Play className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Démarrage..." : "Démarrer la session"}
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              <div className="relative pt-4">
                <span className="absolute right-0 top-0 text-[11px] text-muted-foreground">
                  {title.length}/200
                </span>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  placeholder="Ajoutez un titre ou une note rapide..."
                  aria-label="Titre de session"
                  className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              {error && <div className="text-xs text-destructive">{error}</div>}
            </div>

            <div className="mt-5 flex justify-center">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-6 text-muted-foreground">
                Annuler
              </Button>
            </div>
          </div>
        </Motion.div>
      </div>
    </Motion.div>
  )
}
