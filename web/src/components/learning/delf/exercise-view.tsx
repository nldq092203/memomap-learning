import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { isImageOption, type DelfExercise } from "@/lib/types/api/delf"
import { CheckCircle2, XCircle, Info } from "lucide-react"

interface ExerciseViewProps {
  exercise: DelfExercise
  index: number
  selectedOption?: number
  isCorrect: boolean | null // null if not submitted yet
  showResults: boolean
  onAnswer: (optionIndex: number) => void
  getAssetUrl?: (filename: string) => string
}

export function ExerciseView({
  exercise,
  index,
  selectedOption,
  isCorrect,
  showResults,
  onAnswer,
  getAssetUrl,
}: ExerciseViewProps) {
  return (
    <Card className={`overflow-hidden transition-colors ${
      showResults
        ? isCorrect
          ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
          : 'border-destructive/50 bg-destructive/5 dark:bg-destructive/10'
        : 'border-border hover:border-border/80'
    }`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                {exercise.title}
              </h3>
              <p className="text-muted-foreground text-sm font-medium">
                {exercise.question_text}
              </p>
            </div>

            {/* Status Icons for review mode */}
            {showResults && (
              <div className="shrink-0 pt-1">
                {isCorrect ? (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm">Correct</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm">Incorrect</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <RadioGroup
            value={selectedOption?.toString() || ""}
            onValueChange={(val) => onAnswer(parseInt(val, 10))}
            disabled={showResults}
            className="grid gap-3"
          >
            {exercise.options.map((option, optIdx) => {
              const strVal = optIdx.toString()
              const isSelected = selectedOption === optIdx
              
              // Only highlight correct/incorrect if results are shown
              let optionClass = "flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all hover:bg-muted/50"
              
              if (showResults) {
                const isThisOptionCorrect = optIdx === exercise.correct_answer
                
                if (isThisOptionCorrect) {
                  optionClass += " border-green-500/50 bg-green-50/50 dark:bg-green-900/20 shadow-sm"
                } else if (isSelected && !isThisOptionCorrect) {
                  optionClass += " border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
                } else {
                  optionClass += " opacity-60 grayscale"
                }
              } else if (isSelected) {
                optionClass += " border-primary bg-primary/5 ring-1 ring-primary"
              }

              return (
                <Label
                  key={optIdx}
                  htmlFor={`ex-${exercise.id}-opt-${optIdx}`}
                  className={optionClass}
                >
                  <RadioGroupItem 
                    value={strVal} 
                    id={`ex-${exercise.id}-opt-${optIdx}`}
                    className="mt-1"
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    {isImageOption(option) ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getAssetUrl ? getAssetUrl(option.img_url) : option.img_url} 
                          alt={option.label}
                          className="rounded-md object-contain bg-white max-h-[150px] border"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <span className="font-medium text-sm leading-relaxed">{option}</span>
                    )}
                  </div>
                </Label>
              )
            })}
          </RadioGroup>

          {/* Explanation in review mode */}
          {showResults && (exercise.explanation || exercise.transcript) && (
            <div className="mt-6 rounded-lg bg-muted/50 p-4 border space-y-3">
              <div className="flex items-center gap-2 font-medium text-primary">
                <Info className="h-4 w-4" />
                Explanation
              </div>
              
              {exercise.transcript && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Transcript Snippet:</span>
                  <p className="text-sm italic border-l-2 border-primary/30 pl-3">
                    "{exercise.transcript}"
                  </p>
                </div>
              )}
              
              {exercise.explanation && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Note:</span>
                  <p className="text-sm">{exercise.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
