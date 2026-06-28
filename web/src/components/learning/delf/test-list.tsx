import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DelfLevel, DelfSection, DelfTestPaperResponse } from "@/lib/types/api/delf"
import { BookOpen, Clock3, Headphones, Loader2, PlayCircle } from "lucide-react"
import { TrainingSurface } from "@/components/learning/ui"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"
import { formatDelfVariantLabel } from "@/lib/utils/delf-routes"

interface TestListProps {
  level: DelfLevel
  variant: string
  section: DelfSection
  tests: DelfTestPaperResponse[]
  loading: boolean
  onSelectTest: (testId: string, level: DelfLevel, variant: string, section: DelfSection) => void
  onBack: () => void
}

export function TestList({
  level,
  variant,
  section,
  tests,
  loading,
  onSelectTest,
  onBack,
}: TestListProps) {
  const Icon = section === "CO" ? Headphones : BookOpen
  const sectionName = section === "CO" ? "Compréhension orale" : "Compréhension écrite"
  const variantLabel = formatDelfVariantLabel(variant)
  const formatExerciseTitle = (testId: string) => {
    const numericId = testId.match(/\d+/)?.[0]
    return numericId ? `Exercice ${Number(numericId)}` : `Exercice ${testId}`
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <section className="pb-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--vintage-cream)] px-3 py-1 text-xs font-semibold text-[var(--vintage-desert-rock)]">
                <Icon className="h-3.5 w-3.5" />
                {sectionName}
              </span>
              <span className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                {tests.length} {tests.length === 1 ? "exercice" : "exercices"}
              </span>
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-5xl">
              DELF {level}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--vintage-muted-ink)] md:text-base">
              {variantLabel} · {sectionName}
            </p>
          </div>
        </div>
      </section>

      <GuestUpgradeHint description="Connectez-vous pour accéder à plus d'exercices, davantage de niveaux et reprendre vos entrainements DELF à tout moment." />

      {loading ? (
        <TrainingSurface className="flex h-[420px] flex-col items-center justify-center space-y-4 border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] text-[var(--vintage-muted-ink)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--vintage-desert-rock)]" />
          <p>Chargement des exercices...</p>
        </TrainingSurface>
      ) : tests.length === 0 ? (
        <TrainingSurface variant="dashed" className="flex h-[420px] flex-col items-center justify-center space-y-4 border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] p-8 text-center">
          <div className="rounded-full bg-[var(--vintage-cream)] p-4">
            <Icon className="h-8 w-8 text-[var(--vintage-desert-rock)]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[var(--vintage-ink)]">Aucun exercice disponible</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--vintage-muted-ink)]">
              Aucun exercice d&apos;entrainement n&apos;est visible pour ce niveau et cette section.
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
        <ScrollArea className="pr-2 sm:pr-4 md:h-[620px]">
          <div className="grid max-w-[1380px] gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((test, index) => (
              <button
                key={test.id}
                type="button"
                onClick={() => onSelectTest(test.test_id, test.level, test.variant, test.section)}
                className="group min-h-[84px] rounded-[14px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 p-2.5 text-left shadow-[0_6px_16px_rgba(74,51,35,0.05)] transition-all hover:-translate-y-0.5 hover:border-[var(--vintage-desert-rock)] hover:shadow-[0_10px_24px_rgba(74,51,35,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vintage-desert-rock)]"
              >
                <div className="flex h-full min-w-0 flex-col gap-2.5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--vintage-porcelain-mist)] px-2 py-0.5 text-[10px] font-semibold text-[var(--vintage-muted-ink)]">
                        <Icon className="h-3 w-3" />
                        {sectionName}
                      </span>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--vintage-cream)] px-1.5 text-[10px] font-semibold text-[var(--vintage-desert-rock)]">
                        {index + 1}
                      </span>
                      {test.status === "draft" && (
                        <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Brouillon
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-[15px] font-semibold tracking-tight text-[var(--vintage-ink)]">
                      {formatExerciseTitle(test.test_id)}
                    </h2>
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--vintage-muted-ink)]">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{test.exercise_count} question{test.exercise_count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="inline-flex h-7 shrink-0 items-center justify-between gap-2 rounded-full bg-[var(--vintage-desert-rock)] px-3 text-xs font-semibold text-white transition-colors group-hover:bg-[#8f7763] sm:min-w-[86px]">
                      Ouvrir
                      <PlayCircle className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
