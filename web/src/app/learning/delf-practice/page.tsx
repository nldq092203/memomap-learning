"use client"

import { LearningNav } from "@/components/learning/layout/learning-nav"
import { useDelfPractice } from "@/lib/hooks/use-delf-practice"
import {
  LevelSectionSelector,
  TestList,
  TestPlayer
} from "@/components/learning/delf"

export default function DelfPracticePage() {
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
    setMode,
  } = useDelfPractice()

  // --- Step 1: Level & Section Selection ---
  if (!level || !section) {
    return (
      <div className="min-h-screen bg-background">
        <LearningNav
          breadcrumbs={[
            { label: "Training", href: "/learning/workspace" },
            { label: "DELF Practice" },
          ]}
          showBackButton
        />
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
          <LevelSectionSelector 
            loading={loading}
            onSelect={(lvl, sec) => loadTests(lvl, sec)} 
          />
        </div>
      </div>
    )
  }

  // --- Step 2: Test List ---
  if (!currentTest) {
    return (
      <div className="min-h-screen bg-background">
        <LearningNav
          breadcrumbs={[
            { label: "Training", href: "/learning/workspace" },
            { label: "DELF Practice", onClick: resetAll },
            { label: `${level} ${section}` },
          ]}
          showBackButton
        />
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
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

  // --- Step 3: Test Player ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <LearningNav
        breadcrumbs={[
          { label: "Training", href: "/learning/workspace" },
          { label: "DELF Practice", onClick: resetAll },
          { label: `${level} ${section}`, onClick: resetTest },
          { label: currentTest.test_id },
        ]}
        showBackButton
      />
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
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
          onBack={resetAll}
        />
      </div>
    </div>
  )
}
