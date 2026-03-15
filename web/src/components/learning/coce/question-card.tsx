import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoCeQuestion } from "@/lib/types/api/coce"
import { cn } from "@/lib/utils"
import { Check, CheckCircle2, XCircle } from "lucide-react"

interface QuestionCardProps {
  question: CoCeQuestion
  index: number
  userAnswers: Array<{ questionId: string; selectedIndices: number[] }>
  showResults: boolean
  isAnswerCorrect: (questionId: string) => boolean | null
  onAnswerChange: (questionId: string, optionIndex: number, isMultiple: boolean) => void
}

export function QuestionCard({
  question,
  index,
  userAnswers,
  showResults,
  isAnswerCorrect,
  onAnswerChange,
}: QuestionCardProps) {
  const userAnswer = userAnswers.find((answer) => answer.questionId === question.id)
  const selectedIndices = userAnswer?.selectedIndices ?? []
  const isCorrect = isAnswerCorrect(question.id)
  const isMultiple = question.type === "multiple_choice"

  return (
    <Card
      id={`question-${index}`}
      className={cn(
        "scroll-mt-40 rounded-[28px] border border-slate-200 bg-white shadow-sm",
        showResults &&
          (isCorrect
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-rose-200 bg-rose-50/40")
      )}
    >
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Question {index + 1}
            </p>
            <CardTitle className="text-lg font-semibold leading-7 text-slate-950">
              {question.question}
            </CardTitle>
          </div>

          {showResults && (
            <div className="shrink-0">
              {isCorrect ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <XCircle className="h-5 w-5" />
                </div>
              )}
            </div>
          )}
        </div>

        {isMultiple && !showResults && (
          <p className="text-sm text-slate-500">Plusieurs réponses possibles.</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedIndices.includes(optionIndex)
          const isCorrectOption = question.correct_indices.includes(optionIndex)
          const optionLetter = String.fromCharCode(65 + optionIndex)

          return (
            <button
              key={optionIndex}
              type="button"
              disabled={showResults}
              onClick={() => onAnswerChange(question.id, optionIndex, isMultiple)}
              className={cn(
                "flex w-full items-start gap-4 rounded-[22px] border px-4 py-4 text-left transition-all",
                "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/60",
                isSelected && !showResults && "border-teal-300 bg-teal-50 text-slate-950 shadow-sm",
                showResults && isCorrectOption && "border-emerald-300 bg-emerald-50 text-slate-950",
                showResults && isSelected && !isCorrectOption && "border-rose-300 bg-rose-50 text-slate-950",
                showResults && "cursor-default"
              )}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-500",
                  showResults && isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                  showResults && isSelected && !isCorrectOption && "border-rose-500 bg-rose-500 text-white"
                )}
              >
                {isSelected || (showResults && isCorrectOption) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  optionLetter
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-medium leading-7">{option}</p>
              </div>
            </button>
          )
        })}

        {showResults && question.explanation && (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Explication
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
