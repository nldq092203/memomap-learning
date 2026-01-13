import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CoCeQuestions } from "@/lib/types/api/coce"
import { QuestionCard } from "@/components/learning/coce/question-card"
import { CheckCircle2, RefreshCw, BookOpen } from "lucide-react"

interface QuestionsViewProps {
  questions: CoCeQuestions | null
  activeType: "co" | "ce" | null
  loading: boolean
  showResults: boolean
  score: { percentage: number; correct: number; total: number } | null
  userAnswers: Array<{ questionId: string; selectedIndices: number[] }>
  isAnswerCorrect: (questionId: string) => boolean | null
  onAnswerChange: (questionId: string, optionIndex: number, isMultiple: boolean) => void
  onSubmit: () => void
  onTryAgain: () => void
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
  onSubmit,
  onTryAgain,
}: QuestionsViewProps) {
  // Show prompt if no practice type selected
  if (!activeType) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 text-base font-medium">Choose a practice type above</p>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            Select either CO (Listening) or CE (Reading) practice to begin your comprehension exercises
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading && !questions) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading questions...</p>
        </CardContent>
      </Card>
    )
  }

  if (!questions || questions.meta.type !== (activeType === "co" ? "compréhension_orale" : "compréhension_écrite")) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Questions not available for this exercise.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="border-b border-primary/10 bg-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl">{questions.meta.titre}</CardTitle>
              <CardDescription className="text-sm">{questions.meta.consigne}</CardDescription>
            </div>
            {showResults && score && (
              <Badge 
                variant={score.percentage >= 70 ? "default" : "destructive"}
                className="text-base px-4 py-2"
              >
                {score.percentage}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <span className="font-semibold text-primary">{questions.meta.total_questions}</span>
              </div>
              <span>Questions</span>
            </div>
            {showResults && score && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{score.correct} correct</span>
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

      {!showResults ? (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex justify-center py-8">
            <Button 
              onClick={onSubmit} 
              size="lg" 
              className="gap-2 px-8 text-base transition-all hover:scale-105 hover:shadow-lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              Submit Answers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 animate-in zoom-in-95 duration-500">
          <CardContent className="flex flex-col items-center gap-6 py-10">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
                <span className="text-3xl font-bold">{score?.percentage}%</span>
              </div>
              <p className="text-lg font-semibold">
                {score && score.percentage >= 70 ? "Great job! 🎉" : "Keep practicing! 💪"}
              </p>
              <p className="text-sm text-muted-foreground">
                You got {score?.correct} out of {score?.total} questions correct
              </p>
            </div>
            <Button
              onClick={onTryAgain}
              variant="outline"
              size="lg"
              className="gap-2 transition-all hover:scale-105"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
