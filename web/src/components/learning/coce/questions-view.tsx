import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CoCeQuestions } from "@/lib/types/api/coce"
import { QuestionCard } from "@/components/learning/coce/question-card"
import { BookOpen, RefreshCw } from "lucide-react"

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
      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-teal-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="mt-5 text-lg font-semibold text-slate-950">Choisissez un mode</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Sélectionnez CO ou CE pour afficher les questions.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading && !questions) {
    return (
      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-teal-600" />
          <p className="mt-4 text-sm text-slate-500">Chargement des questions...</p>
        </CardContent>
      </Card>
    )
  }

  if (
    !questions ||
    questions.meta.type !== (activeType === "co" ? "compréhension_orale" : "compréhension_écrite")
  ) {
    return (
      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Questions indisponibles pour ce mode.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Mode examen
              </p>
              <CardTitle className="text-2xl font-semibold text-slate-950">
                {questions.meta.titre}
              </CardTitle>
              {questions.meta.consigne && (
                <CardDescription className="text-sm leading-6 text-slate-500">
                  {questions.meta.consigne}
                </CardDescription>
              )}
            </div>

            {showResults && score && (
              <Badge className="rounded-full bg-teal-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500">
                {score.percentage}%
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-3 px-6 py-5 text-sm text-slate-600">
          <div className="rounded-full bg-slate-100 px-3 py-1.5 font-medium">
            {questions.questions.length} questions
          </div>
          {showResults && score && (
            <div className="rounded-full bg-teal-50 px-3 py-1.5 font-medium text-teal-700">
              {score.correct} bonnes réponses
            </div>
          )}
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
