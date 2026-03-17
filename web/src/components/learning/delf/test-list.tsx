import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DelfLevel, DelfSection, DelfTestPaperResponse } from "@/lib/types/api/delf"
import { ArrowLeft, BookOpen, Clock3, Headphones, Loader2, PlayCircle } from "lucide-react"
import { TrainingChoiceCard, TrainingSectionHeader, TrainingSurface } from "@/components/learning/ui"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"

interface TestListProps {
  level: DelfLevel
  section: DelfSection
  tests: DelfTestPaperResponse[]
  loading: boolean
  onSelectTest: (testId: string, level: DelfLevel, variant: string, section: string) => void
  onBack: () => void
}

export function TestList({
  level,
  section,
  tests,
  loading,
  onSelectTest,
  onBack,
}: TestListProps) {
  const Icon = section === "CO" ? Headphones : BookOpen
  const sectionName = section === "CO" ? "Compréhension orale" : "Compréhension écrite"

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Niveaux
        </button>
        <span>/</span>
        <span className="font-medium text-slate-700">
          {level} {section}
        </span>
      </div>

      <TrainingSectionHeader
        title={`Sujets DELF ${level}`}
        description="Choisissez un sujet pour commencer votre session d'entrainement."
        badge={
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Icon className="h-3.5 w-3.5" />
            {sectionName}
          </div>
        }
        aside={
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {tests.length} {tests.length === 1 ? "sujet" : "sujets"}
          </Badge>
        }
      />

      <GuestUpgradeHint description="Connectez-vous pour accéder à plus de sujets, davantage de niveaux et reprendre vos entrainements DELF à tout moment." />

      {loading ? (
        <TrainingSurface className="flex h-[420px] flex-col items-center justify-center space-y-4 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p>Chargement des sujets...</p>
        </TrainingSurface>
      ) : tests.length === 0 ? (
        <TrainingSurface variant="dashed" className="flex h-[420px] flex-col items-center justify-center space-y-4 p-8 text-center">
          <div className="rounded-full bg-slate-100 p-4">
            <Icon className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-950">Aucun sujet disponible</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Aucun sujet d&apos;entrainement n&apos;est visible pour ce niveau et cette section.
            </p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-4 rounded-full">
            Choisir un autre niveau
          </Button>
        </TrainingSurface>
      ) : (
        <ScrollArea className="h-[620px] pr-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {tests.map((test) => (
              <TrainingChoiceCard
                key={test.id}
                onClick={() => onSelectTest(test.test_id, test.level, test.variant, test.section)}
                eyebrow={
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Sujet {test.test_id}
                  </div>
                }
                title={`Variante ${test.variant}`}
                meta={
                  test.status === "draft" ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Brouillon</Badge>
                  ) : null
                }
                footer={
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    <span>{test.exercise_count} exercice{test.exercise_count > 1 ? "s" : ""}</span>
                  </div>
                }
                action={
                  <Button
                    className="w-full justify-between rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 sm:w-auto"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectTest(test.test_id, test.level, test.variant, test.section)
                    }}
                  >
                    Commencer
                    <PlayCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </Button>
                }
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
