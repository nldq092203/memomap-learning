import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CoCeQuestions } from "@/lib/types/api/coce"
import { QuestionCard } from "@/components/learning/coce/question-card"
import { BookOpen, RefreshCw } from "lucide-react"
import { formatReadableText } from "@/lib/text/readable-text"

function matchesActiveType(
  questionType: string | undefined,
  activeType: "co" | "ce" | null
) {
  if (!questionType || !activeType) return false

  const normalized = questionType.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return activeType === "co"
    ? normalized === "comprehension_orale"
    : normalized === "comprehension_ecrite"
}

interface QuestionsViewProps {
  questions: CoCeQuestions | null
  activeType: "co" | "ce" | null
  loading: boolean
  showResults: boolean
  score: { percentage: number; correct: number; total: number } | null
  userAnswers: Array<{ questionId: string; selectedIndices: number[] }>
  isAnswerCorrect: (questionId: string) => boolean | null
  onAnswerChange: (questionId: string, optionIndex: number, isMultiple: boolean) => void
}

export function QuestionsView({
  questions,
  activeType,
  loading,
  showResults,
  score,
  userAnswers,
  isAnswerCorrect,
  onAnswerChange,
}: QuestionsViewProps) {
  if (!activeType) {
    return (
      <Card className="rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
        <CardContent className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="mt-5 text-lg font-semibold text-[var(--vintage-ink)]">Choisissez un mode</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--vintage-muted-ink)]">
            Sélectionnez CO ou CE pour afficher les questions.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading && !questions) {
    return (
      <Card className="rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-[var(--vintage-desert-rock)]" />
          <p className="mt-4 text-sm text-[var(--vintage-muted-ink)]">Chargement des questions...</p>
        </CardContent>
      </Card>
    )
  }

  if (
    !questions ||
    !matchesActiveType(questions.meta.type, activeType)
  ) {
    return (
      <Card className="rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
        <CardContent className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-[var(--vintage-muted-ink)]">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm text-[var(--vintage-muted-ink)]">Questions indisponibles pour ce mode.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
        <CardHeader className="space-y-3 border-b border-[var(--vintage-soft-sandstone)]/70 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--vintage-muted-ink)]">
                Mode examen
              </p>
              <CardTitle className="text-2xl font-semibold text-[var(--vintage-ink)]">
                {questions.meta.titre}
              </CardTitle>
              {questions.meta.consigne && (
                <CardDescription className="whitespace-pre-line text-sm leading-7 text-[var(--vintage-muted-ink)]">
                  {formatReadableText(questions.meta.consigne)}
                </CardDescription>
              )}
            </div>

            {showResults && score && (
              <Badge className="rounded-full bg-[var(--vintage-desert-rock)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--vintage-desert-rock)]">
                {score.percentage}%
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6 py-5 text-sm text-[var(--vintage-muted-ink)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1.5 font-medium">
              {questions.questions.length} questions
            </div>
            {showResults && score && (
              <div className="rounded-full bg-[var(--vintage-cream)] px-3 py-1.5 font-medium text-[var(--vintage-desert-rock)]">
                {score.correct} bonnes réponses
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            userAnswers={userAnswers}
            showResults={showResults}
            isAnswerCorrect={isAnswerCorrect}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </div>
    </div>
  )
}
