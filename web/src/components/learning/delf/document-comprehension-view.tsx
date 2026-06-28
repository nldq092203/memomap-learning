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
    <Card className="overflow-hidden rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 shadow-[0_14px_34px_rgba(74,51,35,0.07)]">
      <CardContent className="p-0">
        <div className="space-y-3 border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="flex items-start gap-3 text-lg font-semibold leading-7 text-[var(--vintage-ink)]">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-xs font-bold text-[var(--vintage-desert-rock)]">
              {index + 1}
            </span>
            <span>{exercise.title}</span>
          </h3>
          
          {exercise.instruction && (
            <p className="rounded-r-xl border-l-4 border-[var(--vintage-desert-rock)] bg-[var(--vintage-feather-white)]/80 px-4 py-2 text-sm font-medium leading-6 text-[var(--vintage-muted-ink)] sm:text-base">
              {exercise.instruction}
            </p>
          )}
        </div>

        {docs.length > 0 && (
          <div className="space-y-5 bg-[var(--vintage-porcelain-mist)]/55 p-4 sm:p-6 lg:p-7">
            {docs.map((doc, docIdx) => {
              const d = doc as any
              const textBlocks = formatDelfReadingText(d.content || d.body)

              return (
                <article key={d.id || docIdx} className="overflow-hidden rounded-[18px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-sm">
                  <div className="border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-desert-rock)] px-4 py-3 text-white sm:px-6">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                      Document {docIdx + 1}
                    </span>
                  </div>

                  {(d.type === "email" || (!d.title && d.sender)) && (
                    <div className="space-y-2 border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 py-3 text-sm sm:px-6">
                      <div className="flex items-center gap-2 font-medium text-[var(--vintage-ink)]">
                        <Mail className="h-4 w-4 shrink-0 text-[var(--vintage-desert-rock)]" />
                        <span className="w-12 text-right text-[var(--vintage-muted-ink)]">De :</span>
                        <span>{d.sender || "Inconnu"}</span>
                      </div>
                      {d.subject && (
                        <div className="flex items-start gap-2 font-semibold text-[var(--vintage-ink)]">
                          <span className="w-12 shrink-0 text-right text-sm font-medium text-[var(--vintage-muted-ink)]">Objet :</span>
                          <span>{d.subject}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {d.title && (
                    <div className="flex items-center justify-center border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-4 py-5 text-center sm:px-6">
                      <h4 className="max-w-3xl text-xl font-bold leading-tight text-[var(--vintage-ink)] sm:text-2xl">{d.title}</h4>
                    </div>
                  )}
                  
                  <div className="mx-auto max-w-4xl px-4 py-6 text-[var(--vintage-ink)] sm:px-8 sm:py-8 lg:px-10">
                    <div className="space-y-4">
                      {textBlocks.map((block, blockIdx) => {
                        if (block.kind === "heading") {
                          return (
                            <h5
                              key={`${block.text}-${blockIdx}`}
                              className="whitespace-normal text-base font-bold uppercase leading-7 tracking-wide text-[var(--vintage-ink)] sm:text-lg"
                            >
                              {block.text}
                            </h5>
                          )
                        }

                        if (block.kind === "source") {
                          return (
                            <p
                              key={`${block.text}-${blockIdx}`}
                              className="whitespace-normal text-right text-sm italic leading-7 text-[var(--vintage-muted-ink)] sm:text-[15px]"
                            >
                              {block.text}
                            </p>
                          )
                        }

                        return (
                          <p
                            key={`${block.text}-${blockIdx}`}
                            className="whitespace-normal text-[15px] font-normal leading-8 text-[var(--vintage-ink)] sm:text-base"
                          >
                            {block.text}
                          </p>
                        )
                      })}
                    </div>
                  </div>

                  {d.parts && d.parts.length > 0 && (
                    <div className="space-y-3 border-t border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-cream)]/55 p-4 sm:p-5">
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--vintage-desert-rock)]">
                        Parties à analyser
                      </h4>
                      {d.parts.map((part: any) => (
                        <div key={part.label} className="flex gap-3 text-sm">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[var(--vintage-feather-white)] font-bold text-[var(--vintage-desert-rock)] shadow-sm">
                            {part.label}
                          </span>
                          <p className="font-medium italic leading-relaxed text-[var(--vintage-muted-ink)]">
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
            <div className="h-px flex-1 bg-[var(--vintage-soft-sandstone)]"></div>
            <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-[var(--vintage-muted-ink)]">
              Questions
            </span>
            <div className="h-px flex-1 bg-[var(--vintage-soft-sandstone)]"></div>
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
