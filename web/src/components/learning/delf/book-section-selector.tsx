import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"
import { TrainingChoiceCard, TrainingSurface } from "@/components/learning/ui"
import type { DelfLevel, DelfSection, DelfTestPaperResponse } from "@/lib/types/api/delf"
import { formatDelfVariantLabel } from "@/lib/utils/delf-routes"
import { BookMarked, BookOpen, Clock3, Headphones, Loader2 } from "lucide-react"

interface BookSectionSelectorProps {
  level: DelfLevel
  tests: DelfTestPaperResponse[]
  loading: boolean
  preferredSection?: DelfSection | null
  onSelectSection: (variant: string, section: DelfSection) => void
  onBack: () => void
}

interface VariantSummary {
  variant: string
  sections: Partial<Record<DelfSection, { tests: number; exercises: number; hasAudio: boolean }>>
  totalTests: number
}

const sectionLabels: Record<DelfSection, string> = {
  CO: "Compréhension orale",
  CE: "Compréhension écrite",
  PE: "Production écrite",
  PO: "Production orale",
}

const availableSections: DelfSection[] = ["CE", "CO"]

function summarizeVariants(tests: DelfTestPaperResponse[]): VariantSummary[] {
  const summaries = new Map<string, VariantSummary>()

  tests.forEach((test) => {
    const current = summaries.get(test.variant) ?? {
      variant: test.variant,
      sections: {},
      totalTests: 0,
    }
    const section = current.sections[test.section] ?? {
      tests: 0,
      exercises: 0,
      hasAudio: false,
    }

    section.tests += 1
    section.exercises += test.exercise_count
    section.hasAudio = section.hasAudio || Boolean(test.audio_filename)
    current.sections[test.section] = section
    current.totalTests += 1
    summaries.set(test.variant, current)
  })

  return Array.from(summaries.values()).sort((a, b) => a.variant.localeCompare(b.variant))
}

export function BookSectionSelector({
  level,
  tests,
  loading,
  preferredSection,
  onSelectSection,
  onBack,
}: BookSectionSelectorProps) {
  const summaries = summarizeVariants(tests)
  const visibleSections = preferredSection ? [preferredSection] : availableSections
  const preferredSectionLabel = preferredSection ? sectionLabels[preferredSection] : "CE ou CO"

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <section className="pb-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--vintage-cream)] px-3 py-1 text-xs font-semibold text-[var(--vintage-desert-rock)]">
                <BookMarked className="h-3.5 w-3.5" />
                Livre
              </span>
              <span className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                {summaries.length} {summaries.length === 1 ? "livre" : "livres"}
              </span>
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-5xl">
              DELF {level}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--vintage-muted-ink)] md:text-base">
              Choisissez le livre pour {preferredSectionLabel}.
            </p>
          </div>
        </div>
      </section>

      <GuestUpgradeHint description="Connectez-vous pour accéder à plus de livres, davantage de niveaux et reprendre vos entrainements DELF à tout moment." />

      {loading ? (
        <TrainingSurface className="flex h-[420px] flex-col items-center justify-center space-y-4 border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] text-[var(--vintage-muted-ink)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--vintage-desert-rock)]" />
          <p>Chargement des livres...</p>
        </TrainingSurface>
      ) : summaries.length === 0 ? (
        <TrainingSurface variant="dashed" className="flex h-[420px] flex-col items-center justify-center space-y-4 border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] p-8 text-center">
          <div className="rounded-full bg-[var(--vintage-cream)] p-4">
            <BookMarked className="h-8 w-8 text-[var(--vintage-desert-rock)]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[var(--vintage-ink)]">Aucun livre disponible</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--vintage-muted-ink)]">
              Aucun entrainement n&apos;est visible pour ce niveau.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onBack}
            className="mt-4 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)]"
          >
            Choisir un autre niveau
          </Button>
        </TrainingSurface>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {summaries.map((summary) => (
            <TrainingChoiceCard
              key={summary.variant}
              interactive={false}
              className="border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 shadow-[0_14px_34px_rgba(74,51,35,0.07)]"
              icon={
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
                  <BookMarked className="h-6 w-6" />
                </div>
              }
              eyebrow={
                <div className="inline-flex rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                  {visibleSections.reduce((total, section) => total + (summary.sections[section]?.tests ?? 0), 0)} exercices
                </div>
              }
              title={formatDelfVariantLabel(summary.variant)}
            >
              <div className={preferredSection ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
                {visibleSections.map((section) => {
                  const info = summary.sections[section]
                  const Icon = section === "CO" ? Headphones : BookOpen

                  return (
                    <Button
                      key={section}
                      type="button"
                      variant="outline"
                      disabled={!info}
                      className="h-auto justify-start rounded-[22px] border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 py-4 text-left text-[var(--vintage-ink)] hover:border-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-cream)] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onSelectSection(summary.variant, section)}
                    >
                      <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{section}</p>
                        <p className="text-xs text-[var(--vintage-muted-ink)]">{sectionLabels[section]}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--vintage-muted-ink)]">
                          <span>{info?.tests ?? 0} exercices</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {info?.exercises ?? 0} questions
                          </span>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </TrainingChoiceCard>
          ))}
        </div>
      )}
    </div>
  )
}
