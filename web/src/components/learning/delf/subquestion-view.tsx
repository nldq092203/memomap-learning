import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { isImageOption, type DelfSubQuestion } from "@/lib/types/api/delf"
import { CheckCircle2, XCircle, Info } from "lucide-react"

interface SubQuestionViewProps {
  question: DelfSubQuestion
  answer: any // type depends on question type
  showResults: boolean
  onAnswer: (value: any) => void
  getAssetUrl?: (filename: string) => string
}

export function SubQuestionView({
  question,
  answer,
  showResults,
  onAnswer,
  getAssetUrl,
}: SubQuestionViewProps) {
  // --- Determine if the answer is correct for the top-level indicator ---
  let isCorrect: boolean | null = null
  if (showResults) {
    if (question.type === "single_choice" || question.type === "multiple_choice" || question.type === "multiple_choice_image" || question.type === "true_false") {
      isCorrect = answer === question.correct_answer
    } else if (question.type === "multiple_select_image" && question.correct_answers) {
      const correctArr = question.correct_answers as string[]
      const ansArr = answer as string[] || []
      // Exact match for full correct check
      isCorrect = ansArr.length === correctArr.length && ansArr.every(v => correctArr.includes(v))
    } else if (question.type === "label_matching" && question.correct_answers) {
      const correctMap = question.correct_answers as Record<string, number>
      const ansMap = answer as Record<string, number> || {}
      isCorrect = Object.keys(correctMap).every(k => ansMap[k] === correctMap[k])
    }
  }

  return (
    <div className={`rounded-[24px] border bg-card p-5 transition-colors ${
      showResults
        ? isCorrect
          ? 'border-green-500/40 bg-green-50/30 dark:border-green-800/40 dark:bg-green-950/20'
          : 'border-destructive/40 bg-destructive/5 dark:border-destructive/40 dark:bg-destructive/10'
        : 'border-border'
    }`}>
      <div className="space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            {question.number !== undefined && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-100 text-xs font-bold text-teal-700">
                {question.number}
              </span>
            )}
            <p className="text-base font-semibold leading-7 text-slate-900">{question.question_text}</p>
          </div>
          
          {showResults && isCorrect !== null && (
            <div className="shrink-0 pt-0.5">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          )}
        </div>

        {/* --- Single Choice Rendering --- */}
        {(question.type === "single_choice" || question.type === "multiple_choice" || question.type === "multiple_choice_image" || question.type === "true_false") && question.options && (
          <RadioGroup
            value={answer?.toString() || ""}
            onValueChange={(val) => onAnswer(parseInt(val, 10))}
            disabled={showResults}
            className={question.type === "multiple_choice_image" ? "grid gap-3 md:grid-cols-3" : "grid gap-2"}
          >
            {question.options.map((option, optIdx) => {
              const strVal = optIdx.toString()
              const isSelected = answer === optIdx
              
              let optionClass =
                question.type === "multiple_choice_image"
                  ? "flex cursor-pointer flex-col overflow-hidden rounded-[22px] border p-3 transition-all hover:border-emerald-200 hover:bg-emerald-50/40"
                  : "flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              if (showResults) {
                const isThisCorrect = optIdx === question.correct_answer
                if (isThisCorrect) {
                  optionClass += " border-green-500/50 bg-green-50/50 dark:bg-green-900/20 shadow-sm"
                } else if (isSelected && !isThisCorrect) {
                  optionClass += " border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
                } else {
                  optionClass += " opacity-60 grayscale"
                }
              } else if (isSelected) {
                optionClass += " border-primary bg-primary/5 ring-1 ring-primary"
              }

              return (
                <Label key={optIdx} htmlFor={`sq-${question.id}-opt-${optIdx}`} className={optionClass}>
                  <RadioGroupItem
                    value={strVal}
                    id={`sq-${question.id}-opt-${optIdx}`}
                    className={question.type === "multiple_choice_image" ? "sr-only" : "mt-1"}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    {isImageOption(option) ? (
                      <div className="mt-[-2px] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {option.label}
                          </span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getAssetUrl ? getAssetUrl(option.img_url) : option.img_url} 
                          alt={option.label}
                          className="h-[140px] w-full rounded-xl border border-slate-200 bg-white object-contain p-2"
                          loading="lazy"
                        />
                        {option.desc && <span className="text-sm font-medium leading-5 text-slate-700">{option.desc}</span>}
                      </div>
                    ) : (
                      <span className="font-medium text-sm leading-relaxed">{option}</span>
                    )}
                  </div>
                </Label>
              )
            })}
          </RadioGroup>
        )}

        {/* --- Multiple Select Image Rendering --- */}
        {question.type === "multiple_select_image" && question.options && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {question.options.map((option, optIdx) => {
              if (!isImageOption(option)) return null
              
              const ansArr = answer as string[] || []
              const isSelected = ansArr.includes(option.label)
              const correctArr = showResults ? (question.correct_answers as string[] || []) : []
              const isCorrectTarget = correctArr.includes(option.label)

              let boxClass = "relative flex cursor-pointer flex-col overflow-hidden rounded-[22px] border-2 transition-all hover:border-emerald-300"
              if (showResults) {
                if (isCorrectTarget) {
                  boxClass += " border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/30"
                } else if (isSelected && !isCorrectTarget) {
                  boxClass += " border-destructive bg-destructive/10"
                } else {
                  boxClass += " border-muted opacity-60 grayscale"
                }
              } else if (isSelected) {
                boxClass += " border-primary bg-primary/5 ring-2 ring-primary/30"
              } else {
                boxClass += " border-border bg-card"
              }

              return (
                <Label key={optIdx} htmlFor={`sq-${question.id}-chk-${optIdx}`} className={boxClass}>
                  <div className="p-2 flex items-center justify-between border-b bg-muted/30">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-background border text-xs font-bold shadow-sm">
                      {option.label.toUpperCase()}
                    </span>
                    <Checkbox 
                      id={`sq-${question.id}-chk-${optIdx}`} 
                      checked={isSelected}
                      disabled={showResults}
                      onCheckedChange={(checked) => {
                        if (checked) onAnswer([...ansArr, option.label])
                        else onAnswer(ansArr.filter(v => v !== option.label))
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-center bg-white aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getAssetUrl ? getAssetUrl(option.img_url) : option.img_url} 
                      alt={option.desc || option.label}
                      className="object-contain w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  {option.desc && (
                    <div className="p-2 text-center text-xs font-medium border-t bg-muted/10 truncate">
                      {option.desc}
                    </div>
                  )}
                  
                  {showResults && (
                    <div className="absolute top-2 right-8">
                      {isCorrectTarget ? (
                         <CheckCircle2 className="h-5 w-5 text-green-600 drop-shadow-sm" />
                       ) : (isSelected && !isCorrectTarget) ? (
                         <XCircle className="h-5 w-5 text-destructive drop-shadow-sm bg-white rounded-full bg-opacity-80" />
                       ) : null}
                    </div>
                  )}
                </Label>
              )
            })}
          </div>
        )}

        {/* --- Label Matching Rendering --- */}
        {question.type === "label_matching" && question.labels && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {question.labels.map(label => (
                <div key={label.number} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-foreground/10 text-xs font-bold shrink-0">
                    {label.number}
                  </span>
                  <span>{label.description}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {['A', 'B', 'C', 'D', 'E', 'F'].filter(char => {
                 // only show inputs for parts that actually exist in the correct_answers mapping or are needed.
                 // we can infer required keys from correct_answers if we have them
                 if (!question.correct_answers) return true;
                 return char in (question.correct_answers as Record<string, number>)
              }).map(partLabel => {
                const ansMap = answer as Record<string, number> || {}
                const userVal = ansMap[partLabel]
                const correctVal = showResults ? (question.correct_answers as Record<string, number>)[partLabel] : undefined
                
                let inputClass = "flex items-center gap-2 border rounded-md p-2 pl-3 transition-colors "
                if (showResults) {
                  if (userVal === correctVal) inputClass += "border-green-400 bg-green-50 dark:bg-green-950/30"
                  else inputClass += "border-destructive bg-destructive/10"
                } else if (userVal) {
                  inputClass += "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                } else {
                  inputClass += "bg-card"
                }

                return (
                  <div key={partLabel} className={inputClass}>
                    <span className="font-bold text-lg text-primary">{partLabel}</span>
                    <select 
                      className="ml-2 bg-transparent border-b border-primary/30 outline-none text-center font-medium w-12 pb-1 focus:border-primary disabled:opacity-100 disabled:cursor-not-allowed appearance-none"
                      value={userVal || ""}
                      disabled={showResults}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        onAnswer({ ...ansMap, [partLabel]: isNaN(val) ? undefined : val })
                      }}
                    >
                      <option value=""></option>
                      {question.labels?.map(l => (
                        <option key={l.number} value={l.number}>{l.number}</option>
                      ))}
                    </select>
                    {showResults && (
                      <span className="ml-1 shrink-0">
                         {userVal === correctVal ? (
                           <CheckCircle2 className="h-4 w-4 text-green-600" />
                         ) : (
                           <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                             <XCircle className="h-4 w-4" /> 
                             (Correct: {correctVal})
                           </span>
                         )}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Explanation */}
        {showResults && question.explanation && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 border space-y-2 text-sm leading-relaxed">
            <div className="flex items-center gap-2 font-medium text-primary mb-1">
              <Info className="h-4 w-4" />
              Explication
            </div>
            <p className="text-muted-foreground">{question.explanation}</p>
          </div>
        )}
        
      </div>
    </div>
  )
}
