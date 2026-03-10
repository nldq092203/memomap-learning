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
    <Card className="overflow-hidden border shadow-sm">
      <CardContent className="p-0">
        
        {/* Header & Instruction */}
        <div className="bg-muted/30 border-b p-5 sm:p-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
              {index + 1}
            </span>
            {exercise.title}
          </h3>
          
          {exercise.instruction && (
            <p className="text-base font-medium text-foreground/80 border-l-4 border-primary/40 pl-4 py-1.5 bg-background">
              {exercise.instruction}
            </p>
          )}

          {exercise.question_text && (
            <p className="text-muted-foreground text-sm font-medium mt-2">
              {exercise.question_text}
            </p>
          )}
        </div>

        {/* Sub-Questions Loop */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
             <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              Questions
            </span>
            <div className="h-px bg-border flex-1"></div>
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
