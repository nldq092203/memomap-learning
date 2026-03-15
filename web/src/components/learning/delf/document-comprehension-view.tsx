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
        </div>

        {docs.length > 0 && (
          <div className="p-5 sm:p-8 space-y-6">
            {docs.map((doc, docIdx) => {
              const d = doc as any
              return (
                <div key={d.id || docIdx} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-950 px-5 py-3 text-white">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                      Document {docIdx + 1}
                    </span>
                  </div>

                  {(d.type === "email" || (!d.title && d.sender)) && (
                    <div className="space-y-2 border-b bg-slate-50 px-5 py-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="w-12 text-right text-slate-500">De :</span>
                        <span>{d.sender || "Inconnu"}</span>
                      </div>
                      {d.subject && (
                        <div className="flex items-start gap-2 font-semibold text-slate-900">
                          <span className="w-12 shrink-0 text-right text-sm font-medium text-slate-500">Objet :</span>
                          <span>{d.subject}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {d.title && (
                    <div className="flex items-center justify-center border-b bg-slate-50 px-5 py-4 text-center">
                      <h4 className="text-lg font-bold text-slate-950">{d.title}</h4>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap p-5 text-[15px] font-medium leading-relaxed text-slate-800 sm:p-6">
                    {d.content || d.body}
                  </div>

                  {d.parts && d.parts.length > 0 && (
                    <div className="space-y-3 border-t bg-teal-50/60 p-4 sm:p-5">
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-700">
                        Parties à analyser
                      </h4>
                      {d.parts.map((part: any) => (
                        <div key={part.label} className="flex gap-3 text-sm">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-teal-100 font-bold text-teal-700 shadow-sm">
                            {part.label}
                          </span>
                          <p className="font-medium italic leading-relaxed text-slate-700">
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

        <div className="p-5 sm:p-8 pt-0 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border"></div>
            <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Questions
            </span>
            <div className="h-px flex-1 bg-border"></div>
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
