import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CEFRLevel } from "@/lib/types/api/coce"
import { GUEST_ALLOWED_LEVEL, useGuest } from "@/lib/contexts/guest-context"
import { cn } from "@/lib/utils"
import { BookOpen, Headphones, Lock } from "lucide-react"

const LEVEL_INFO: Record<CEFRLevel, { name: string; description: string; color: string; enabled: boolean }> = {
  A2: {
    name: "A2 - Elementaire",
    description: "Comprendre des phrases simples et frequentes",
    color: "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/78 hover:border-[var(--vintage-desert-rock)]",
    enabled: true,
  },
  B1: {
    name: "B1 - Intermediaire",
    description: "Comprendre les points essentiels d'un contenu clair",
    color: "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/78 hover:border-[var(--vintage-desert-rock)]",
    enabled: true,
  },
  B2: {
    name: "B2 - Intermediaire avance",
    description: "Comprendre des textes plus complexes et interagir avec aisance",
    color: "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/78 hover:border-[var(--vintage-desert-rock)]",
    enabled: true,
  },
  C1: {
    name: "C1 - Avance",
    description: "Temporairement indisponible",
    color: "bg-slate-100 border-slate-200",
    enabled: false,
  },
}

const AVAILABLE_COCE_LEVELS: CEFRLevel[] = ["A2", "B1", "B2"]

interface LevelSelectionProps {
  onSelectLevel: (level: CEFRLevel) => void
  mode?: "co" | "ce" | null
}

export function LevelSelection({ onSelectLevel, mode }: LevelSelectionProps) {
  const { isGuest } = useGuest()
  const Icon = mode === "co" ? Headphones : BookOpen
  const title = mode === "co"
    ? "Audio CO"
    : mode === "ce"
      ? "Audio CE"
      : "CO / CE"
  const description = mode === "co"
    ? "Choisissez un niveau pour travailler la compréhension orale."
    : mode === "ce"
      ? "Choisissez un niveau pour travailler la compréhension écrite."
      : "Choisissez un niveau."

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--vintage-desert-rock)]">
          {mode === "co" ? "Compréhension orale" : mode === "ce" ? "Compréhension écrite" : "CO / CE"}
        </p>
        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 text-[var(--vintage-desert-rock)]" />
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--vintage-ink)]">
            {title}
          </h1>
        </div>
        <p className="max-w-xl text-base text-[var(--vintage-muted-ink)]">
          {description}
        </p>
      </header>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--vintage-ink)]">Choisissez votre niveau</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_COCE_LEVELS.map((lvl) => {
            const info = LEVEL_INFO[lvl]
            const isLockedForGuest = isGuest && lvl !== GUEST_ALLOWED_LEVEL

            return (
              <Card
                key={lvl}
                className={cn(
                  "border-2 transition-all",
                  isLockedForGuest
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                    : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(74,51,35,0.12)]",
                  info.color
                )}
                onClick={() => {
                  if (isLockedForGuest) return
                  onSelectLevel(lvl)
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{info.name}</CardTitle>
                    {isLockedForGuest && <Lock className="h-4 w-4 text-slate-400" />}
                  </div>
                  <p className="text-xs text-[var(--vintage-muted-ink)]">
                    {isLockedForGuest ? "Disponible apres connexion" : info.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    disabled={isLockedForGuest}
                  >
                    {isLockedForGuest ? `A2 seulement en mode invite` : `Continuer`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { LEVEL_INFO }
