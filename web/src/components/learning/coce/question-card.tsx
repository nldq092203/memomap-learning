import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoCeQuestion } from "@/lib/types/api/coce"
import { formatReadableText } from "@/lib/text/readable-text"
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
        "scroll-mt-40 rounded-[28px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]",
        showResults &&
          (isCorrect
            ? "border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)]/45"
            : "border-rose-200 bg-rose-50/40")
      )}
    >
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--vintage-muted-ink)]">
              Question {index + 1}
            </p>
            <CardTitle className="whitespace-pre-line text-lg font-semibold leading-7 text-[var(--vintage-ink)]">
              {formatReadableText(question.question)}
            </CardTitle>
          </div>

          {showResults && (
            <div className="shrink-0">
              {isCorrect ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
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
          <p className="text-sm text-[var(--vintage-muted-ink)]">Plusieurs réponses possibles.</p>
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
                "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-ink)] hover:border-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-cream)]/60",
                isSelected && !showResults && "border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)] text-[var(--vintage-ink)] shadow-sm",
                showResults && isCorrectOption && "border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)] text-[var(--vintage-ink)]",
                showResults && isSelected && !isCorrectOption && "border-rose-300 bg-rose-50 text-[var(--vintage-ink)]",
                showResults && "cursor-default"
              )}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-[var(--vintage-desert-rock)] bg-[var(--vintage-desert-rock)] text-white"
                    : "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] text-[var(--vintage-muted-ink)]",
                  showResults && isCorrectOption && "border-[var(--vintage-desert-rock)] bg-[var(--vintage-desert-rock)] text-white",
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
          <div className="rounded-[22px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-muted-ink)]">
              Explication
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--vintage-ink)]">
              {formatReadableText(question.explanation)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
