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
    <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="space-y-4 border-b bg-slate-50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {index + 1}
            </span>
            {exercise.title}
          </h3>
          
          {exercise.instruction && (
            <p className="border-l-4 border-teal-300 bg-white py-1.5 pl-4 text-base font-medium text-slate-700">
              {exercise.instruction}
            </p>
          )}

          {exercise.question_text && (
            <p className="mt-2 text-sm font-medium text-slate-600">
              {exercise.question_text}
            </p>
          )}
        </div>

        {/* Sub-Questions Loop */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
             <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Questions
            </span>
            <div className="h-px flex-1 bg-border"></div>
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
