import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { CoCeQuestion } from "@/lib/types/api/coce"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle } from "lucide-react"

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
  const userAnswer = userAnswers.find((a) => a.questionId === question.id)
  const isCorrect = isAnswerCorrect(question.id)
  const isMultiple = question.type === "multiple_choice"

  return (
    <Card
      className={cn(
        "border-border/60",
        showResults &&
          (isCorrect
            ? "border-green-500/50 bg-green-500/5"
            : "border-red-500/50 bg-red-500/5")
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium">
            <span className="text-muted-foreground">Q{index + 1}.</span> {question.question}
          </CardTitle>
          {showResults && (
            <div className="shrink-0">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          )}
        </div>
        {isMultiple && !showResults && (
          <p className="text-xs text-muted-foreground">Select all that apply</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isMultiple ? (
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const isSelected = userAnswer?.selectedIndices.includes(optionIndex) || false
              const isCorrectOption = question.correct_indices.includes(optionIndex)
              
              return (
                <div
                  key={optionIndex}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    !showResults && "cursor-pointer hover:bg-muted/50",
                    showResults && isCorrectOption && "border-green-500/50 bg-green-500/10",
                    showResults && isSelected && !isCorrectOption && "border-red-500/50 bg-red-500/10"
                  )}
                  onClick={() => !showResults && onAnswerChange(question.id, optionIndex, true)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={showResults}
                    className="mt-0.5"
                  />
                  <Label className="flex-1 cursor-pointer text-sm leading-relaxed">
                    {option}
                  </Label>
                  {showResults && isCorrectOption && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  )}
                  {showResults && isSelected && !isCorrectOption && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <RadioGroup
            value={userAnswer?.selectedIndices[0]?.toString() || ""}
            onValueChange={(value) => onAnswerChange(question.id, parseInt(value), false)}
            disabled={showResults}
          >
            {question.options.map((option, optionIndex) => {
              const isSelected = userAnswer?.selectedIndices[0] === optionIndex
              const isCorrectOption = question.correct_indices.includes(optionIndex)
              
              return (
                <div
                  key={optionIndex}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    !showResults && "cursor-pointer hover:bg-muted/50",
                    showResults && isCorrectOption && "border-green-500/50 bg-green-500/10",
                    showResults && isSelected && !isCorrectOption && "border-red-500/50 bg-red-500/10"
                  )}
                >
                  <RadioGroupItem value={optionIndex.toString()} className="mt-0.5" />
                  <Label className="flex-1 cursor-pointer text-sm leading-relaxed">
                    {option}
                  </Label>
                  {showResults && isCorrectOption && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  )}
                  {showResults && isSelected && !isCorrectOption && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                </div>
              )
            })}
          </RadioGroup>
        )}

        {showResults && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Explanation:</p>
            <p className="mt-1 text-sm leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
