"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { DelfExercise, DelfDocument, DelfPerson } from "@/lib/types/api/delf"
import { CheckCircle2, XCircle, Info, FileText } from "lucide-react"

interface MatchingExerciseViewProps {
  exercise: DelfExercise
  index: number
  selections: Record<string, string>  // { doc_id -> person_label }
  showResults: boolean
  onSelectMatch: (docId: string, personLabel: string) => void
}

export function MatchingExerciseView({
  exercise,
  index,
  selections,
  showResults,
  onSelectMatch,
}: MatchingExerciseViewProps) {
  const documents = exercise.documents || []
  const persons = exercise.persons || []
  const correctAnswers = exercise.correct_answers || {}
  const explanations = exercise.explanations || {}

  // Count correct matches
  const correctCount = showResults
    ? documents.filter((doc) => selections[doc.id] === correctAnswers[doc.id]).length
    : 0
  const totalDocs = documents.length

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-8">
        {/* Instruction Header */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            {exercise.title}
          </h3>
          
          {exercise.instruction && (
            <p className="text-base italic text-foreground/80 border-l-4 border-primary/30 pl-4 py-1 bg-primary/5 rounded-r-md">
              {exercise.instruction}
            </p>
          )}
          
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            {exercise.question_text}
          </p>
        </div>

        {/* Score Summary (results only) */}
        {showResults && (
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
            correctCount === totalDocs
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30'
              : correctCount >= totalDocs / 2
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30'
          }`}>
            {correctCount === totalDocs ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <span className="text-sm font-medium">
              {correctCount} / {totalDocs} correct matches
            </span>
          </div>
        )}

        {/* Documents Grid — stylized magazine-like cards */}
        <div>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" />
            Documents
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.map((doc, docIdx) => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                docIndex={docIdx}
                selectedPerson={selections[doc.id]}
                correctPerson={showResults ? correctAnswers[doc.id] : undefined}
                explanation={showResults ? explanations[doc.id] : undefined}
                showResults={showResults}
              />
            ))}
          </div>
        </div>

        {/* Matching Grid — one radio group per document */}
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Associez chaque document à une personne
          </h4>

          <div className="space-y-5">
            {documents.map((doc) => {
              const userSelection = selections[doc.id]
              const isCorrectMatch = showResults && userSelection === correctAnswers[doc.id]
              const isWrongMatch = showResults && userSelection && userSelection !== correctAnswers[doc.id]

              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border p-4 transition-all ${
                    showResults
                      ? isCorrectMatch
                        ? 'border-green-400/60 bg-green-50/60 dark:bg-green-950/20'
                        : isWrongMatch
                        ? 'border-red-300/60 bg-red-50/30 dark:bg-red-950/10'
                        : 'border-amber-300/50 bg-amber-50/30'
                      : userSelection
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                      {doc.title.toUpperCase()}
                    </span>
                    
                    {showResults && (
                      <span className="ml-auto">
                        {isCorrectMatch ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </span>
                    )}
                  </div>

                  <RadioGroup
                    value={userSelection || ""}
                    onValueChange={(val) => onSelectMatch(doc.id, val)}
                    disabled={showResults}
                    className="flex flex-wrap gap-2"
                  >
                    {persons.map((person) => {
                      const isSelected = userSelection === person.label
                      const isCorrectPerson = showResults && correctAnswers[doc.id] === person.label

                      let pillClass = "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all"
                      if (showResults) {
                        if (isCorrectPerson) {
                          pillClass += " border-green-500 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        } else if (isSelected && !isCorrectPerson) {
                          pillClass += " border-red-400 bg-red-100 text-red-700 line-through dark:bg-red-900/30 dark:text-red-300"
                        } else {
                          pillClass += " opacity-50 border-muted"
                        }
                      } else if (isSelected) {
                        pillClass += " border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      } else {
                        pillClass += " hover:border-primary/40 hover:bg-muted/50"
                      }

                      return (
                        <Label
                          key={person.label}
                          htmlFor={`match-${doc.id}-${person.label}`}
                          className={pillClass}
                        >
                          <RadioGroupItem
                            value={person.label}
                            id={`match-${doc.id}-${person.label}`}
                            className="h-3 w-3"
                          />
                          <span>{person.label}</span>
                        </Label>
                      )
                    })}
                  </RadioGroup>

                  {/* Show explanation after results */}
                  {showResults && explanations[doc.id] && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5 border-t pt-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>{explanations[doc.id]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Persons Reference (always shown) */}
        <div className="rounded-xl border bg-muted/30 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Personnes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {persons.map((person) => {
              const isUnmatched = showResults && exercise.unmatched_persons?.includes(person.label)
              return (
                <div
                  key={person.label}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    isUnmatched 
                      ? 'bg-muted/50 text-muted-foreground/70 line-through' 
                      : ''
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground/10 text-xs font-bold shrink-0 mt-0.5">
                    {person.label}
                  </span>
                  <span className="leading-relaxed">{person.description}</span>
                </div>
              )
            })}
          </div>

          {/* Show unmatched persons explanation */}
          {showResults && exercise.unmatched_persons && exercise.unmatched_persons.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-1.5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">No matching document:</span>
              {exercise.unmatched_persons.map((label) => (
                <div key={label} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span><strong>{label}.</strong> {explanations[label]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Document Card Sub-component ---

// Vibrant color palette for document cards
const DOC_COLORS = [
  { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800/40", accent: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-pink-50 dark:bg-pink-950/20", border: "border-pink-200 dark:border-pink-800/40", accent: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800/40", accent: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/40", accent: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/40", accent: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-800/40", accent: "text-teal-700 dark:text-teal-300" },
]

function DocumentCard({ 
  doc, 
  docIndex,
  selectedPerson,
  correctPerson,
  explanation,
  showResults,
}: { 
  doc: DelfDocument
  docIndex: number
  selectedPerson?: string
  correctPerson?: string
  explanation?: string
  showResults: boolean
}) {
  const color = DOC_COLORS[docIndex % DOC_COLORS.length]
  const isCorrect = showResults && selectedPerson === correctPerson

  return (
    <Card className={`overflow-hidden transition-all ${color.border} ${color.bg} shadow-sm hover:shadow-md`}>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className={`text-xs font-bold uppercase tracking-wider ${color.accent}`}>
          {doc.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <p className="text-sm text-center leading-relaxed font-medium text-foreground/90">
          {doc.content}
        </p>

        {/* Show match status after results */}
        {showResults && (
          <div className="mt-3 pt-2 border-t border-dashed flex items-center gap-1.5 text-xs">
            {isCorrect ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className="text-muted-foreground">
              Correct: <strong>{correctPerson}</strong>
              {selectedPerson && selectedPerson !== correctPerson && (
                <> · Your answer: <span className="line-through">{selectedPerson}</span></>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
