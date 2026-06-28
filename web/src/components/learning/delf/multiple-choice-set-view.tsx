import { Card, CardContent } from "@/components/ui/card"
import type { DelfExercise } from "@/lib/types/api/delf"
import { SubQuestionView } from "./subquestion-view"
import { HelpCircle } from "lucide-react"

interface MultipleChoiceSetViewProps {
  exercise: DelfExercise
  index: number
  subQuestionAnswers: Record<string, any>
  showResults: boolean
  onAnswerSubQuestion: (questionId: string, value: any) => void
  getAssetUrl?: (filename: string) => string
}

export function MultipleChoiceSetView({
  exercise,
  index,
  subQuestionAnswers,
  showResults,
  onAnswerSubQuestion,
  getAssetUrl,
}: MultipleChoiceSetViewProps) {
  return (
    <Card className="overflow-hidden rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 shadow-[0_14px_34px_rgba(74,51,35,0.07)]">
      <CardContent className="p-0">
        <div className="space-y-4 border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--vintage-ink)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-xs font-bold text-[var(--vintage-desert-rock)]">
              {index + 1}
            </span>
            {exercise.title}
          </h3>
          
          {exercise.instruction && (
            <p className="rounded-r-xl border-l-4 border-[var(--vintage-desert-rock)] bg-[var(--vintage-feather-white)]/80 py-1.5 pl-4 pr-3 text-base font-medium text-[var(--vintage-muted-ink)]">
              {exercise.instruction}
            </p>
          )}

          {exercise.question_text && (
            <p className="mt-2 text-sm font-medium text-[var(--vintage-muted-ink)]">
              {exercise.question_text}
            </p>
          )}
        </div>

        {/* Sub-Questions Loop */}
        <div className="space-y-6 p-5 sm:p-8">
          <div className="flex items-center gap-3">
             <HelpCircle className="h-4 w-4 shrink-0 text-[var(--vintage-muted-ink)]" />
            <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-[var(--vintage-muted-ink)]">
              Questions
            </span>
            <div className="h-px flex-1 bg-[var(--vintage-soft-sandstone)]"></div>
          </div>

          <div className="space-y-6">
            {exercise.questions?.map((q) => (
              <SubQuestionView
                key={q.id}
                question={q}
                answer={subQuestionAnswers[q.id]}
                showResults={showResults}
                onAnswer={(val) => onAnswerSubQuestion(q.id, val)}
                getAssetUrl={getAssetUrl}
              />
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
