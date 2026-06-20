import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"
import { TrainingChoiceCard, TrainingSectionHeader, TrainingSurface } from "@/components/learning/ui"
import type { DelfLevel, DelfSection, DelfTestPaperResponse } from "@/lib/types/api/delf"
import { formatDelfVariantLabel } from "@/lib/utils/delf-routes"
import { ArrowLeft, BookMarked, BookOpen, Clock3, Headphones, Loader2 } from "lucide-react"

interface BookSectionSelectorProps {
  level: DelfLevel
  tests: DelfTestPaperResponse[]
  loading: boolean
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
  onSelectSection,
  onBack,
}: BookSectionSelectorProps) {
  const summaries = summarizeVariants(tests)

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Niveaux
        </button>
        <span>/</span>
        <span className="font-medium text-slate-700">{level}</span>
      </div>

      <TrainingSectionHeader
        title={`DELF ${level}`}
        description="Choisissez le livre, puis la compétence CE ou CO. Les exercices suivent l'ordre du livre."
        badge={
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <BookMarked className="h-3.5 w-3.5" />
            Livres
          </div>
        }
        aside={
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {summaries.length} {summaries.length === 1 ? "livre" : "livres"}
          </Badge>
        }
      />

      <GuestUpgradeHint description="Connectez-vous pour accéder à plus de livres, davantage de niveaux et reprendre vos entrainements DELF à tout moment." />

      {loading ? (
        <TrainingSurface className="flex h-[420px] flex-col items-center justify-center space-y-4 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p>Chargement des livres...</p>
        </TrainingSurface>
      ) : summaries.length === 0 ? (
        <TrainingSurface variant="dashed" className="flex h-[420px] flex-col items-center justify-center space-y-4 p-8 text-center">
          <div className="rounded-full bg-slate-100 p-4">
            <BookMarked className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-950">Aucun livre disponible</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Aucun entrainement n&apos;est visible pour ce niveau.
            </p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-4 rounded-full">
            Choisir un autre niveau
          </Button>
        </TrainingSurface>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {summaries.map((summary) => (
            <TrainingChoiceCard
              key={summary.variant}
              interactive={false}
              icon={
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <BookMarked className="h-6 w-6" />
                </div>
              }
              eyebrow={
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {summary.totalTests} {summary.totalTests === 1 ? "exercice" : "exercices"}
                </div>
              }
              title={formatDelfVariantLabel(summary.variant)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {availableSections.map((section) => {
                  const info = summary.sections[section]
                  const Icon = section === "CO" ? Headphones : BookOpen

                  return (
                    <Button
                      key={section}
                      type="button"
                      variant="outline"
                      disabled={!info}
                      className="h-auto justify-start rounded-[22px] border-slate-200 px-4 py-4 text-left text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onSelectSection(summary.variant, section)}
                    >
                      <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{section}</p>
                        <p className="text-xs text-slate-500">{sectionLabels[section]}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
