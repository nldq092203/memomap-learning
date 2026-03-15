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
  const hasImageOptions = exercise.options?.some((option) => isImageOption(option))

  return (
    <Card className={`overflow-hidden rounded-[28px] transition-colors ${
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
              <p className="text-base font-semibold leading-7 text-slate-800">
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
            className={hasImageOptions ? "grid gap-3 md:grid-cols-3" : "grid gap-3"}
          >
            {exercise.options.map((option, optIdx) => {
              const strVal = optIdx.toString()
              const isSelected = selectedOption === optIdx
              
              let optionClass = hasImageOptions
                ? "flex cursor-pointer flex-col overflow-hidden rounded-[22px] border p-3 transition-all"
                : "flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all hover:bg-muted/50"
              
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
                    className={hasImageOptions ? "sr-only" : "mt-1"}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    {isImageOption(option) ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {option.label}
                          </span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getAssetUrl ? getAssetUrl(option.img_url) : option.img_url} 
                          alt={option.label}
                          className="h-[150px] w-full rounded-xl border border-slate-200 bg-white object-contain p-2"
                          loading="lazy"
                        />
                        {option.desc && <span className="line-clamp-2 text-sm font-medium leading-5 text-slate-700">{option.desc}</span>}
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
                Explication
              </div>
              
              {exercise.transcript && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Extrait :</span>
                  <p className="text-sm italic border-l-2 border-primary/30 pl-3">
                    "{exercise.transcript}"
                  </p>
                </div>
              )}
              
              {exercise.explanation && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Note :</span>
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
