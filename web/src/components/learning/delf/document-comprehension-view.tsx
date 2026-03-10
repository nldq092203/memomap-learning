import { Card, CardContent } from "@/components/ui/card"
import type { DelfExercise } from "@/lib/types/api/delf"
import { SubQuestionView } from "./subquestion-view"
import { Mail, User } from "lucide-react"

interface DocumentComprehensionViewProps {
  exercise: DelfExercise
  index: number
  subQuestionAnswers: Record<string, any>
  showResults: boolean
  onAnswerSubQuestion: (questionId: string, value: any) => void
  getAssetUrl?: (filename: string) => string
}

export function DocumentComprehensionView({
  exercise,
  index,
  subQuestionAnswers,
  showResults,
  onAnswerSubQuestion,
  getAssetUrl,
}: DocumentComprehensionViewProps) {
  const docs = exercise.documents?.length ? exercise.documents : (exercise.document ? [exercise.document] : [])

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
        </div>

        {/* Embedded Reading Documents */}
        {docs.length > 0 && (
          <div className="p-5 sm:p-8 space-y-6">
            {docs.map((doc, docIdx) => {
              // Cast to any to safely access fields that might only exist on DelfReadingDocument
              const d = doc as any
              return (
                <div key={d.id || docIdx} className="rounded-xl border shadow-sm bg-card overflow-hidden">
                  
                  {/* Email details */}
                  {(d.type === "email" || (!d.title && d.sender)) && (
                    <div className="bg-muted/40 border-b px-5 py-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 font-medium text-foreground/90">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground w-12 text-right">De :</span>
                        <span>{d.sender || "Inconnu"}</span>
                      </div>
                      {d.subject && (
                        <div className="flex items-start gap-2 font-semibold text-foreground">
                          <span className="text-muted-foreground font-medium text-sm w-12 text-right shrink-0">Objet :</span>
                          <span>{d.subject}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Article header */}
                  {d.title && (
                    <div className="bg-muted/30 border-b px-5 py-4 flex items-center justify-center text-center">
                      <h4 className="font-bold text-lg text-foreground">{d.title}</h4>
                    </div>
                  )}
                  
                  <div className="p-5 sm:p-6 text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium text-[15px]">
                    {d.content || d.body}
                  </div>

                  {/* Explicitly labeled parts reference (if provided) */}
                  {d.parts && d.parts.length > 0 && (
                    <div className="border-t bg-primary/5 p-4 sm:p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-3">
                        Parties à analyser
                      </h4>
                      {d.parts.map((part: any) => (
                        <div key={part.label} className="flex gap-3 text-sm">
                          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary/20 text-primary font-bold shrink-0 mt-0.5 shadow-sm">
                            {part.label}
                          </span>
                          <p className="font-medium text-foreground/80 italic leading-relaxed">
                            « {part.excerpt} »
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Sub-Questions Loop */}
        <div className="p-5 sm:p-8 pt-0 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1"></div>
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              Questions
            </span>
            <div className="h-px bg-border flex-1"></div>
          </div>

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

      </CardContent>
    </Card>
  )
}
