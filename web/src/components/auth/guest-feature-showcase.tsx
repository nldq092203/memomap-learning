"use client"

import {
  Bot,
  BookOpen,
  Mic,
  BarChart3,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGuest } from "@/lib/contexts/guest-context"

// ─── Feature Showcase ────────────────────────────────────────────────
// Shown in the dashboard analytics area for guests.
// Replaces the empty chart + sessions cards with a compelling preview
// of what authenticated users unlock.
// ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Bot,
    title: "Assistant IA",
    description: "Explications instantanées, mnémoniques et vérification grammaticale.",
    gradient: "from-violet-500/10 to-fuchsia-500/10",
    iconColor: "text-violet-600",
    borderHover: "group-hover:border-violet-300",
  },
  {
    icon: BookOpen,
    title: "Vocabulaire SRS",
    description: "Flashcards avec répétition espacée et révision intelligente.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600",
    borderHover: "group-hover:border-emerald-300",
  },
  {
    icon: Mic,
    title: "Transcription audio",
    description: "Dictée avec sauvegarde automatique sur Google Drive.",
    gradient: "from-pink-500/10 to-rose-500/10",
    iconColor: "text-pink-600",
    borderHover: "group-hover:border-pink-300",
  },
  {
    icon: BarChart3,
    title: "Suivi de progression",
    description: "Statistiques, streaks quotidiens et objectifs personnalisés.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600",
    borderHover: "group-hover:border-amber-300",
  },
] as const

export function GuestFeatureShowcase() {
  const { setShowSyncModal } = useGuest()

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 shrink-0">
          Débloquez tout MemoMap
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
      </div>

      {/* Feature cards 2×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <Card
              key={feature.title}
              className={cn(
                "group border border-border/50 transition-all duration-200 cursor-pointer",
                "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                feature.borderHover,
              )}
              onClick={() => setShowSyncModal(true)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={cn(
                    "shrink-0 rounded-xl p-2.5 bg-gradient-to-br transition-transform group-hover:scale-110",
                    feature.gradient,
                    feature.iconColor,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold tracking-tight">
                    {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-1">
        <Button
          onClick={() => setShowSyncModal(true)}
          className="rounded-full px-6 shadow-md shadow-primary/15 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
        >
          Se connecter avec Google
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
