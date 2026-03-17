import { Button } from "@/components/ui/button"
import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { GUEST_ALLOWED_LEVEL, useGuest } from "@/lib/contexts/guest-context"
import { BookOpen, Headphones, Lock, Mic, PenTool, Sparkles } from "lucide-react"
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
  onSelect: (level: DelfLevel, section: DelfSection) => void
  loading?: boolean
}

export function LevelSectionSelector({ onSelect, loading }: LevelSectionSelectorProps) {
  const { isGuest } = useGuest()
  const availableSections = DELF_SECTIONS.filter((section) => section.id === "CO" || section.id === "CE")

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <TrainingSectionHeader
        eyebrow="Preparation DELF"
        title="Entrainement DELF"
        description="Choisissez un niveau puis une competence pour lancer un entrainement cible sur A2, B1 ou B2."
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

      <div className="grid gap-5 lg:grid-cols-3">
        {DELF_LEVELS.map((level) => {
          const isLockedForGuest = isGuest && level.id !== GUEST_ALLOWED_LEVEL

          return (
            <TrainingChoiceCard
              key={level.id}
              interactive={false}
              eyebrow={
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span>Niveau {level.id}</span>
                  {isLockedForGuest && <Lock className="h-3 w-3" />}
                </div>
              }
              title={level.id}
              description={
                isLockedForGuest ? "Disponible apres connexion. Le mode invite est limite au niveau A2." : level.description
              }
              footer={<p className="text-sm font-medium text-slate-700">{level.name}</p>}
            >
              <div className="grid gap-3">
                <div className="grid gap-3">
                  {availableSections.map((section) => (
                    <Button
                      key={section.id}
                      type="button"
                      variant="outline"
                      disabled={loading || isLockedForGuest}
                      className="h-auto justify-start rounded-[22px] border-slate-200 px-4 py-4 text-left text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-background"
                      onClick={() => onSelect(level.id, section.id)}
                    >
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        {section.icon}
                      </div>
                      <div>
                        <p className="font-semibold">{section.name}</p>
                        <p className="text-xs text-slate-500">
                          {isLockedForGuest ? "A2 seulement en mode invite" : section.description}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </TrainingChoiceCard>
          )
        })}
      </div>
    </div>
  )
}
