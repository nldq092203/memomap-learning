import { CheckCircle2, XCircle } from "lucide-react"
import type { DelfSubQuestion } from "@/lib/types/api/delf"

interface TrueFalseTableViewProps {
  questions: DelfSubQuestion[]
  answers: Record<string, any>
  showResults: boolean
  onAnswer: (questionId: string, value: any) => void
}

interface ParsedTableQuestion {
  question: DelfSubQuestion
  row: string
  column: string
}

const TRUE_FALSE_OPTIONS = ["OUI", "NON"]

function normalizeOption(option: unknown) {
  return String(option || "").trim().toUpperCase()
}

function stripQuestionPrefix(text: string) {
  return text
    .replace(/^\s*(?:[a-z]|\d+)[.)]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseQuestionParts(questionText: string) {
  const normalized = stripQuestionPrefix(questionText)
  const parts = normalized
    .split(/\s+(?:-|–|—|:)\s+/)
    .map(stripQuestionPrefix)
    .filter(Boolean)

  if (parts.length !== 2) return null
  return parts as [string, string]
}

function isCriterionLabel(value: string) {
  return /\b(cours|tarif|prix|annuel|hebdomadaire|possibilit|travail|groupe|avis|positif|gratuit|payant|inscription|horaire|date|dur[eé]e|lieu|public|niveau|contact|accessible|visite)\b/i.test(value)
}

function uniqueInOrder(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index)
}

export function getTrueFalseTableModel(questions: DelfSubQuestion[]) {
  if (questions.length < 4) return null

  const canRender = questions.every((question) => {
    if (question.type !== "true_false" || !question.options || question.options.length !== 2) {
      return false
    }

    const options = question.options.map(normalizeOption)
    return options[0] === TRUE_FALSE_OPTIONS[0] && options[1] === TRUE_FALSE_OPTIONS[1]
  })

  if (!canRender) return null

  const parsed = questions.map((question) => {
    const parts = parseQuestionParts(question.question_text)
    return parts ? { question, parts } : null
  })

  if (parsed.some((item) => item === null)) return null

  const parsedQuestions = parsed as Array<{ question: DelfSubQuestion; parts: [string, string] }>
  const firstParts = parsedQuestions.map((item) => item.parts[0])
  const secondParts = parsedQuestions.map((item) => item.parts[1])
  const firstCriteriaCount = firstParts.filter(isCriterionLabel).length
  const secondCriteriaCount = secondParts.filter(isCriterionLabel).length
  const firstUnique = uniqueInOrder(firstParts)
  const secondUnique = uniqueInOrder(secondParts)

  const rowPartIndex =
    secondCriteriaCount > firstCriteriaCount
      ? 1
      : firstCriteriaCount > secondCriteriaCount
        ? 0
        : firstUnique.length <= secondUnique.length
          ? 0
          : 1

  const rows = uniqueInOrder(parsedQuestions.map((item) => item.parts[rowPartIndex]))
  const columns = uniqueInOrder(parsedQuestions.map((item) => item.parts[rowPartIndex === 0 ? 1 : 0]))

  if (rows.length < 2 || columns.length < 2 || rows.length * columns.length !== questions.length) {
    return null
  }

  const items: ParsedTableQuestion[] = parsedQuestions.map((item) => ({
    question: item.question,
    row: item.parts[rowPartIndex],
    column: item.parts[rowPartIndex === 0 ? 1 : 0],
  }))

  return { rows, columns, items }
}

export function TrueFalseTableView({
  questions,
  answers,
  showResults,
  onAnswer,
}: TrueFalseTableViewProps) {
  const model = getTrueFalseTableModel(questions)
  if (!model) return null

  const findQuestion = (row: string, column: string) => {
    return model.items.find((item) => item.row === row && item.column === column)?.question
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-amber-50/80">
              <th className="sticky left-0 z-10 w-[220px] bg-amber-50/95 px-4 py-3 text-left font-semibold text-slate-700">
                Critère
              </th>
              {model.columns.map((column, index) => (
                <th
                  key={column}
                  colSpan={2}
                  className="border-l border-amber-100 px-3 py-3 text-center text-base font-bold text-slate-900"
                >
                  {index + 1}. {column}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-white">
              <th className="sticky left-0 z-10 bg-white px-4 py-2" />
              {model.columns.map((column) => (
                <th key={column} colSpan={2} className="border-l border-slate-100 p-0">
                  <div className="grid grid-cols-2">
                    <span className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500">
                      OUI
                    </span>
                    <span className="border-l border-slate-100 px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500">
                      NON
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, rowIndex) => (
              <tr key={row} className="border-b border-slate-200 last:border-b-0">
                <th className="sticky left-0 z-10 bg-white px-4 py-4 text-left align-middle text-base font-medium text-slate-800">
                  <span className="mr-2 text-amber-500">{String.fromCharCode(97 + rowIndex)}.</span>
                  {row}
                </th>
                {model.columns.map((column) => {
                  const question = findQuestion(row, column)
                  if (!question) {
                    return (
                      <td key={`${row}-${column}`} colSpan={2} className="border-l border-slate-100 px-3 py-4" />
                    )
                  }

                  const answer = answers[question.id]
                  const correctAnswer = question.correct_answer
                  const isCorrect = showResults && answer === correctAnswer
                  const isWrong = showResults && answer !== undefined && answer !== correctAnswer

                  return (
                    <td key={question.id} colSpan={2} className="border-l border-slate-100 p-0 align-middle">
                      <div
                        className={`grid grid-cols-2 transition-colors ${
                          isCorrect
                            ? "bg-green-50/70"
                            : isWrong
                              ? "bg-rose-50/70"
                              : "bg-white"
                        }`}
                      >
                        {TRUE_FALSE_OPTIONS.map((label, optionIndex) => {
                          const inputId = `tf-table-${question.id}-${optionIndex}`
                          const selected = answer === optionIndex
                          const correct = showResults && correctAnswer === optionIndex
                          const incorrectSelection = showResults && selected && !correct

                          return (
                            <label
                              key={label}
                              htmlFor={inputId}
                              className={`relative flex min-h-14 cursor-pointer items-center justify-center border-l border-slate-100 first:border-l-0 ${
                                showResults ? "cursor-default" : "hover:bg-teal-50/70"
                              }`}
                            >
                              <input
                                id={inputId}
                                name={`tf-table-${question.id}`}
                                type="radio"
                                value={optionIndex}
                                checked={selected}
                                disabled={showResults}
                                onChange={() => onAnswer(question.id, optionIndex)}
                                className="sr-only"
                              />
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded border-2 bg-white transition-all ${
                                  selected
                                    ? "border-teal-500 ring-2 ring-teal-100"
                                    : "border-slate-300"
                                } ${
                                  correct
                                    ? "border-green-500 bg-green-100 text-green-700"
                                    : incorrectSelection
                                      ? "border-rose-500 bg-rose-100 text-rose-700"
                                      : ""
                                }`}
                                aria-hidden="true"
                              >
                                {correct ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : incorrectSelection ? (
                                  <XCircle className="h-4 w-4" />
                                ) : selected ? (
                                  <span className="h-2.5 w-2.5 rounded-sm bg-teal-500" />
                                ) : null}
                              </span>
                              <span className="sr-only">{label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
