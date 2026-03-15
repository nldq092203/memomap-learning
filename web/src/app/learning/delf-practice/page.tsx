"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDelfPractice } from "@/lib/hooks/use-delf-practice"
import {
  LevelSectionSelector,
  TestList,
  TestPlayer,
} from "@/components/learning/delf"

export default function DelfPracticePage() {
  const router = useRouter()
  const {
    level,
    section,
    tests,
    currentTest,
    userAnswers,
    matchingAnswers,
    subQuestionAnswers,
    loading,
    showResults,
    score,
    loadTests,
    loadTest,
    updateAnswer,
    updateMatchingAnswer,
    updateSubQuestionAnswer,
    submitTest,
    resetTest,
    resetAll,
  } = useDelfPractice()

  const shellClassName = currentTest
    ? "min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef8f3_100%)]"
    : "min-h-screen bg-slate-50"

  if (!level || !section) {
    return (
      <div className={shellClassName}>
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l'espace d'entrainement
          </Button>

          <LevelSectionSelector loading={loading} onSelect={(lvl, sec) => loadTests(lvl, sec)} />
        </div>
      </div>
    )
  }

  if (!currentTest) {
    return (
      <div className={shellClassName}>
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l'espace d'entrainement
          </Button>

          <TestList
            level={level}
            section={section}
            tests={tests}
            loading={loading}
            onSelectTest={loadTest}
            onBack={resetAll}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={shellClassName}>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() => router.push("/learning/workspace")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à l'espace d'entrainement
        </Button>

        <TestPlayer
          test={currentTest}
          userAnswers={userAnswers}
          matchingAnswers={matchingAnswers}
          subQuestionAnswers={subQuestionAnswers}
          showResults={showResults}
          score={score}
          onAnswer={updateAnswer}
          onMatchAnswer={updateMatchingAnswer}
          onAnswerSubQuestion={updateSubQuestionAnswer}
          onSubmit={submitTest}
          onRestartTest={resetTest}
          onBackToList={resetTest}
          onBackToRoot={resetAll}
        />
      </div>
    </div>
  )
}
