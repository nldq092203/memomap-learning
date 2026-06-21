import { Card, CardContent } from "@/components/ui/card"
import type { DelfExercise } from "@/lib/types/api/delf"
import { formatDelfReadingText } from "@/lib/utils/delf-text"
import { SubQuestionView } from "./subquestion-view"
import { TrueFalseTableView, getTrueFalseTableModel } from "./true-false-table-view"
import { Mail } from "lucide-react"

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
  const questions = exercise.questions || []
  const trueFalseTableModel = getTrueFalseTableModel(questions)

  return (
    <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="space-y-3 border-b bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="flex items-start gap-3 text-lg font-semibold leading-7 text-slate-950">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {index + 1}
            </span>
            <span>{exercise.title}</span>
          </h3>
          
          {exercise.instruction && (
            <p className="rounded-r-xl border-l-4 border-teal-300 bg-white px-4 py-2 text-sm font-medium leading-6 text-slate-700 sm:text-base">
              {exercise.instruction}
            </p>
          )}
        </div>

        {docs.length > 0 && (
          <div className="space-y-6 bg-slate-50/40 p-4 sm:p-6 lg:p-8">
            {docs.map((doc, docIdx) => {
              const d = doc as any
              const textBlocks = formatDelfReadingText(d.content || d.body)

              return (
                <article key={d.id || docIdx} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white sm:px-6">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                      Document {docIdx + 1}
                    </span>
                  </div>

                  {(d.type === "email" || (!d.title && d.sender)) && (
                    <div className="space-y-2 border-b bg-slate-50 px-4 py-3 text-sm sm:px-6">
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
                    <div className="flex items-center justify-center border-b bg-slate-50 px-4 py-5 text-center sm:px-6">
                      <h4 className="max-w-3xl text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{d.title}</h4>
                    </div>
                  )}
                  
                  <div className="mx-auto max-w-4xl px-4 py-6 text-slate-800 sm:px-8 sm:py-8 lg:px-10">
                    <div className="space-y-4">
                      {textBlocks.map((block, blockIdx) => (
                        block.kind === "heading" ? (
                          <h5
                            key={`${block.text}-${blockIdx}`}
                            className="text-base font-bold uppercase leading-7 tracking-wide text-slate-950 sm:text-lg"
                          >
                            {block.text}
                          </h5>
                        ) : (
                          <p
                            key={`${block.text}-${blockIdx}`}
                            className="text-[15px] font-normal leading-8 text-slate-800 sm:text-base"
                          >
                            {block.text}
                          </p>
                        )
                      ))}
                    </div>
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
                </article>
              )
            })}
          </div>
        )}

        <div className="space-y-6 p-4 pt-6 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border"></div>
            <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Questions
            </span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {trueFalseTableModel ? (
            <TrueFalseTableView
              questions={questions}
              answers={subQuestionAnswers}
              showResults={showResults}
              onAnswer={onAnswerSubQuestion}
            />
          ) : (
            questions.map((q) => (
              <SubQuestionView
                key={q.id}
                question={q}
                answer={subQuestionAnswers[q.id]}
                showResults={showResults}
                onAnswer={(val) => onAnswerSubQuestion(q.id, val)}
                getAssetUrl={getAssetUrl}
              />
            ))
          )}
        </div>

      </CardContent>
    </Card>
  )
}
