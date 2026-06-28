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
    <Card className={`overflow-hidden rounded-[24px] transition-colors ${
      showResults
        ? isCorrect
          ? 'border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)]/45'
          : 'border-destructive/50 bg-destructive/5 dark:bg-destructive/10'
        : 'border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 hover:border-[var(--vintage-desert-rock)]'
    }`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--vintage-ink)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-xs font-bold text-[var(--vintage-desert-rock)]">
                  {index + 1}
                </span>
                {exercise.title}
              </h3>
              <p className="text-base font-semibold leading-7 text-[var(--vintage-ink)]">
                {exercise.question_text}
              </p>
            </div>

            {/* Status Icons for review mode */}
            {showResults && (
              <div className="shrink-0 pt-1">
                {isCorrect ? (
                  <div className="flex items-center gap-1.5 font-medium text-[var(--vintage-desert-rock)]">
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
                  ? "flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-[var(--vintage-soft-sandstone)] p-3 transition-all hover:border-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-porcelain-mist)]"
                : "flex cursor-pointer items-start space-x-3 rounded-lg border border-[var(--vintage-soft-sandstone)] p-4 transition-all hover:bg-[var(--vintage-porcelain-mist)]"
              
              if (showResults) {
                const isThisOptionCorrect = optIdx === exercise.correct_answer
                
                if (isThisOptionCorrect) {
                  optionClass += " border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)]/55 shadow-sm"
                } else if (isSelected && !isThisOptionCorrect) {
                  optionClass += " border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
                } else {
                  optionClass += " opacity-60 grayscale"
                }
              } else if (isSelected) {
                optionClass += " border-[var(--vintage-desert-rock)] bg-[var(--vintage-cream)]/50 ring-1 ring-[var(--vintage-desert-rock)]"
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
                          <span className="rounded-full bg-[var(--vintage-porcelain-mist)] px-2.5 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)]">
                            {option.label}
                          </span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getAssetUrl ? getAssetUrl(option.img_url) : option.img_url} 
                          alt={option.label}
                          className="h-[150px] w-full rounded-xl border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] object-contain p-2"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                    <span className="text-sm font-medium leading-relaxed text-[var(--vintage-ink)]">{option}</span>
                    )}
                  </div>
                </Label>
              )
            })}
          </RadioGroup>

          {/* Explanation in review mode */}
          {showResults && (exercise.explanation || exercise.transcript) && (
            <div className="mt-6 space-y-3 rounded-lg border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] p-4">
              <div className="flex items-center gap-2 font-medium text-[var(--vintage-desert-rock)]">
                <Info className="h-4 w-4" />
                Explication
              </div>
              
              {exercise.transcript && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-[var(--vintage-muted-ink)]">Extrait :</span>
                  <p className="border-l-2 border-[var(--vintage-soft-sandstone)] pl-3 text-sm italic text-[var(--vintage-muted-ink)]">
                    &ldquo;{exercise.transcript}&rdquo;
                  </p>
                </div>
              )}
              
              {exercise.explanation && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-[var(--vintage-muted-ink)]">Note :</span>
                  <p className="text-sm text-[var(--vintage-ink)]">{exercise.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
