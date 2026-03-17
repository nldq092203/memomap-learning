import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CEFRLevel } from "@/lib/types/api/coce"
import { GUEST_ALLOWED_LEVEL, useGuest } from "@/lib/contexts/guest-context"
import { cn } from "@/lib/utils"
import { BookOpen, Lock } from "lucide-react"

const LEVEL_INFO: Record<CEFRLevel, { name: string; description: string; color: string; enabled: boolean }> = {
  A1: {
    name: "A1 - Debutant",
    description: "Temporairement indisponible",
    color: "bg-slate-100 border-slate-200",
    enabled: false,
  },
  A2: {
    name: "A2 - Elementaire",
    description: "Comprendre des phrases simples et frequentes",
    color: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50",
    enabled: true,
  },
  B1: {
    name: "B1 - Intermediaire",
    description: "Comprendre les points essentiels d'un contenu clair",
    color: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50",
    enabled: true,
  },
  B2: {
    name: "B2 - Intermediaire avance",
    description: "Comprendre des textes plus complexes et interagir avec aisance",
    color: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50",
    enabled: true,
  },
  C1: {
    name: "C1 - Avance",
    description: "Temporairement indisponible",
    color: "bg-slate-100 border-slate-200",
    enabled: false,
  },
  C2: {
    name: "C2 - Maitrise",
    description: "Temporairement indisponible",
    color: "bg-slate-100 border-slate-200",
    enabled: false,
  },
}

const AVAILABLE_COCE_LEVELS: CEFRLevel[] = ["A2", "B1", "B2"]

interface LevelSelectionProps {
  onSelectLevel: (level: CEFRLevel) => void
}

export function LevelSelection({ onSelectLevel }: LevelSelectionProps) {
  const { isGuest } = useGuest()

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <BookOpen className="h-6 w-6 text-primary" />
            Entrainement CO / CE
          </CardTitle>
          <p className="text-sm text-muted-foreground md:text-base">
            Travaillez la comprehension orale et ecrite en francais avec des exercices cibles.
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Choisissez votre niveau</h2>
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
                    : "cursor-pointer hover:shadow-md",
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
                  <p className="text-xs text-muted-foreground">
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
                    {isLockedForGuest ? `A2 seulement en mode invite` : `Choisir ${lvl}`}
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
