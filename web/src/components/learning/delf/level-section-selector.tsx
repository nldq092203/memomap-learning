import { Button } from "@/components/ui/button"
import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { GUEST_ALLOWED_DELF_LEVELS, useGuest } from "@/lib/contexts/guest-context"
import { BookOpen, ChevronRight, Headphones, Lock, Mic, PenTool, Sparkles } from "lucide-react"
import { TrainingChoiceCard, TrainingSectionHeader } from "@/components/learning/ui"

export const DELF_LEVELS: { id: DelfLevel; name: string; description: string }[] = [
  { id: "A2", name: "Utilisateur elementaire", description: "Consolider les bases de la comprehension." },
  { id: "B1", name: "Utilisateur independant", description: "Gagner en aisance sur des supports varies." },
  { id: "B2", name: "Utilisateur avance", description: "Travailler precision, nuance et vitesse." },
]

export const DELF_SECTIONS: { id: DelfSection; name: string; icon: React.ReactNode; description: string }[] = [
  { id: "CO", name: "Compréhension orale", icon: <Headphones className="h-5 w-5" />, description: "Audio et ecoute active" },
  { id: "CE", name: "Compréhension écrite", icon: <BookOpen className="h-5 w-5" />, description: "Lecture et analyse" },
  { id: "PE", name: "Production écrite", icon: <PenTool className="h-5 w-5" />, description: "Bientot disponible" },
  { id: "PO", name: "Production orale", icon: <Mic className="h-5 w-5" />, description: "Bientot disponible" },
]

interface LevelSectionSelectorProps {
  onSelect: (level: DelfLevel) => void
  loading?: boolean
}

export function LevelSectionSelector({ onSelect, loading }: LevelSectionSelectorProps) {
  const { isGuest } = useGuest()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <TrainingSectionHeader
        eyebrow="Preparation DELF"
        title="Entrainement DELF"
        description="Choisissez un niveau, puis le livre et la competence a travailler."
        aside={
          <div className="space-y-4 text-right">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-sm text-emerald-800">
              CO et CE disponibles maintenant.
            </div>
          </div>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DELF_LEVELS.map((level) => {
          const isLockedForGuest = isGuest && !GUEST_ALLOWED_DELF_LEVELS.includes(level.id)

          return (
            <TrainingChoiceCard
              key={level.id}
              interactive={!isLockedForGuest}
              onClick={() => onSelect(level.id)}
              eyebrow={
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span>Niveau {level.id}</span>
                  {isLockedForGuest && <Lock className="h-3 w-3" />}
                </div>
              }
              title={level.id}
              description={
                isLockedForGuest ? "Disponible apres connexion. Le mode invite couvre A2 et B1." : level.description
              }
              footer={<p className="text-sm font-medium text-slate-700">{level.name}</p>}
              action={
                <Button
                  type="button"
                  disabled={loading || isLockedForGuest}
                  className="h-10 w-full justify-between rounded-full bg-emerald-100 px-4 text-emerald-700 hover:bg-emerald-200 sm:w-auto"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(level.id)
                  }}
                >
                  Voir les livres
                  <ChevronRight className="h-4 w-4" />
                </Button>
              }
            >
              <div className="flex flex-wrap gap-2">
                {DELF_SECTIONS.filter((section) => section.id === "CO" || section.id === "CE").map((section) => (
                  <div
                    key={section.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    {section.icon}
                    {section.id}
                  </div>
                ))}
              </div>
            </TrainingChoiceCard>
          )
        })}
      </div>
    </div>
  )
}
