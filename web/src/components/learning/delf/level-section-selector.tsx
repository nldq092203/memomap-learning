import type { ReactNode } from "react"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"
import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { GUEST_ALLOWED_DELF_LEVELS, useGuest } from "@/lib/contexts/guest-context"
import { BookOpen, ChevronRight, Headphones, Lock, Mic, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"

export const DELF_LEVELS: { id: DelfLevel; name: string; description: string }[] = [
  { id: "A2", name: "Utilisateur élémentaire", description: "Consolider les bases de la compréhension." },
  { id: "B1", name: "Utilisateur indépendant", description: "Gagner en aisance sur des supports variés." },
  { id: "B2", name: "Utilisateur avancé", description: "Travailler précision, nuance et vitesse." },
]

export const DELF_SECTIONS: { id: DelfSection; name: string; icon: ReactNode; description: string }[] = [
  { id: "CO", name: "Compréhension orale", icon: <Headphones className="h-5 w-5" />, description: "Audio et écoute active" },
  { id: "CE", name: "Compréhension écrite", icon: <BookOpen className="h-5 w-5" />, description: "Lecture et analyse" },
  { id: "PE", name: "Production écrite", icon: <PenTool className="h-5 w-5" />, description: "Bientôt disponible" },
  { id: "PO", name: "Production orale", icon: <Mic className="h-5 w-5" />, description: "Bientôt disponible" },
]

interface LevelSectionSelectorProps {
  onSelect: (level: DelfLevel) => void
  loading?: boolean
  preferredSection?: DelfSection | null
}

export function LevelSectionSelector({ onSelect, loading, preferredSection }: LevelSectionSelectorProps) {
  const { isGuest } = useGuest()
  const visibleSections = preferredSection
    ? DELF_SECTIONS.filter((section) => section.id === preferredSection)
    : DELF_SECTIONS.filter((section) => section.id === "CO" || section.id === "CE")
  const preferredSectionName = preferredSection
    ? DELF_SECTIONS.find((section) => section.id === preferredSection)?.name
    : null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="pb-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--vintage-cream)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-desert-rock)]">
                Préparation DELF
              </span>
              {preferredSectionName && (
                <span className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                  {preferredSectionName}
                </span>
              )}
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-5xl">
              Choisissez votre niveau
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--vintage-muted-ink)] md:text-base">
              {preferredSectionName
                ? `Sélectionnez un niveau, puis le livre pour ${preferredSectionName}.`
                : "Choisissez un niveau, puis le livre et la compétence à travailler."}
            </p>
          </div>
        </div>
      </section>

      <GuestUpgradeHint description="Connectez-vous pour débloquer plus de niveaux DELF, plus de livres et retrouver votre progression." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DELF_LEVELS.map((level) => {
          const isLockedForGuest = isGuest && !GUEST_ALLOWED_DELF_LEVELS.includes(level.id)

          return (
            <button
              key={level.id}
              type="button"
              disabled={loading || isLockedForGuest}
              onClick={() => onSelect(level.id)}
              className={cn(
                "group min-h-[260px] rounded-[26px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 p-5 text-left shadow-[0_14px_34px_rgba(74,51,35,0.07)] transition-all hover:-translate-y-0.5 hover:border-[var(--vintage-desert-rock)] hover:shadow-[0_18px_42px_rgba(74,51,35,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vintage-desert-rock)]",
                isLockedForGuest && "cursor-not-allowed opacity-60 hover:translate-y-0"
              )}
            >
              <div className="flex h-full min-w-0 flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1 rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                    <span>Niveau {level.id}</span>
                    {isLockedForGuest && <Lock className="h-3 w-3" />}
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-semibold tracking-tight text-[var(--vintage-ink)]">
                      {level.id}
                    </h2>
                    <p className="text-sm leading-6 text-[var(--vintage-muted-ink)]">
                      {isLockedForGuest ? "Disponible après connexion. Le mode invité couvre A2 et B1." : level.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {visibleSections.map((section) => (
                      <div
                        key={section.id}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-3 py-1.5 text-xs font-medium text-[var(--vintage-muted-ink)]"
                      >
                        {section.icon}
                        {section.id}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-[var(--vintage-muted-ink)]">{level.name}</p>
                  <div className="inline-flex h-10 w-full items-center justify-between rounded-full bg-[var(--vintage-desert-rock)] px-4 text-sm font-semibold text-white transition-colors group-hover:bg-[#8f7763] sm:w-auto sm:min-w-[150px]">
                    Voir les livres
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
