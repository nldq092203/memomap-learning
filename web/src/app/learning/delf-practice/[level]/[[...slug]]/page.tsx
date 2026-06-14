"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookSectionSelector, TestList, TestPlayer } from "@/components/learning/delf"
import { useGuest, GUEST_ALLOWED_DELF_LEVELS } from "@/lib/contexts/guest-context"
import { useDelfPractice } from "@/lib/hooks/use-delf-practice"
import { learningDelfApi } from "@/lib/services/learning-delf-api"
import { notificationService } from "@/lib/services/notification-service"
import type { DelfLevel, DelfSection, DelfTestPaperResponse } from "@/lib/types/api/delf"
import {
  buildDelfLevelRoute,
  buildDelfListRoute,
  buildDelfTestRoute,
  buildDelfVariant,
  DELF_PRACTICE_ROOT,
  isDelfLevel,
  isDelfSection,
} from "@/lib/utils/delf-routes"

type ResolvedRoute =
  | { kind: "invalid" }
  | { kind: "books"; level: DelfLevel }
  | { kind: "legacy-list"; level: DelfLevel; section: DelfSection }
  | { kind: "list"; level: DelfLevel; variant: string; section: DelfSection }
  | {
      kind: "test"
      level: DelfLevel
      variant: string
      section: DelfSection
      testId: string
    }

export default function DelfLevelRoutePage() {
  const params = useParams<{ level: string; slug?: string[] }>()
  const router = useRouter()
  const { isGuest, setShowSyncModal } = useGuest()
  const {
    currentTest,
    userAnswers,
    matchingAnswers,
    subQuestionAnswers,
    showResults,
    score,
    loadTest,
    updateAnswer,
    updateMatchingAnswer,
    updateSubQuestionAnswer,
    submitTest,
    restartCurrentTest,
    resetTest,
  } = useDelfPractice()

  const [tests, setTests] = useState<DelfTestPaperResponse[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingTest, setLoadingTest] = useState(false)

  const route = useMemo<ResolvedRoute>(() => {
    const level = params.level?.toUpperCase()
    if (!level || !isDelfLevel(level)) {
      return { kind: "invalid" }
    }

    const slug = Array.isArray(params.slug) ? params.slug : []
    if (slug.length === 0) {
      return {
        kind: "books",
        level,
      }
    }

    if (slug.length === 1) {
      const section = slug[0]?.toUpperCase()
      if (!section || !isDelfSection(section)) {
        return { kind: "invalid" }
      }
      return {
        kind: "legacy-list",
        level,
        section,
      }
    }

    if (slug.length === 2) {
      const [variant, sectionRaw] = slug
      const section = sectionRaw?.toUpperCase()
      if (!variant || !section || !isDelfSection(section)) {
        return { kind: "invalid" }
      }
      return {
        kind: "list",
        level,
        variant,
        section,
      }
    }

    if (slug.length === 3) {
      const [variant, sectionRaw, testId] = slug
      const section = sectionRaw?.toUpperCase()
      if (!variant || !section || !testId || !isDelfSection(section)) {
        return { kind: "invalid" }
      }
      return {
        kind: "test",
        level,
        variant,
        section,
        testId,
      }
    }

    return { kind: "invalid" }
  }, [params.level, params.slug])

  useEffect(() => {
    if (route.kind === "invalid") {
      router.replace(DELF_PRACTICE_ROOT)
      return
    }

    if (route.kind === "legacy-list") {
      router.replace(buildDelfListRoute(route.level, buildDelfVariant(route.level), route.section))
      return
    }

    if (isGuest && !GUEST_ALLOWED_DELF_LEVELS.includes(route.level)) {
      setShowSyncModal(true)
      router.replace(DELF_PRACTICE_ROOT)
    }
  }, [isGuest, route, router, setShowSyncModal])

  useEffect(() => {
    if (route.kind !== "books" && route.kind !== "list") {
      setTests([])
      return
    }

    let cancelled = false
    const load = async () => {
      setLoadingList(true)
      try {
        const data = await learningDelfApi.listTests(
          route.level,
          route.kind === "list" ? route.section : undefined,
          route.kind === "list" ? route.variant : undefined,
          isGuest,
        )
        if (!cancelled) {
          setTests(data)
        }
      } catch (error) {
        console.error("Failed to load DELF tests:", error)
        notificationService.error("Impossible de charger les sujets DELF")
        if (!cancelled) {
          setTests([])
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isGuest, route])

  useEffect(() => {
    if (route.kind !== "test") {
      resetTest()
      return
    }

    let cancelled = false
    const load = async () => {
      setLoadingTest(true)
      const loaded = await loadTest(
        route.testId,
        route.level,
        route.variant,
        route.section,
        isGuest,
      )
      if (!loaded && !cancelled) {
        router.replace(buildDelfListRoute(route.level, route.variant, route.section))
      }
      if (!cancelled) {
        setLoadingTest(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      resetTest()
    }
  }, [isGuest, loadTest, resetTest, route, router])

  const commonShell = route.kind === "test" && currentTest
    ? "min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef8f3_100%)]"
    : "min-h-screen bg-slate-50"

  if (route.kind === "list") {
    return (
      <div className={commonShell}>
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l&apos;espace d&apos;entrainement
          </Button>

          <TestList
            level={route.level}
            variant={route.variant}
            section={route.section}
            tests={tests}
            loading={loadingList}
            onSelectTest={(testId, level, variant, section) => {
              router.push(buildDelfTestRoute(level, variant, section, testId))
            }}
            onBack={() => router.push(buildDelfLevelRoute(route.level))}
          />
        </div>
      </div>
    )
  }

  if (route.kind === "books") {
    return (
      <div className={commonShell}>
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l&apos;espace d&apos;entrainement
          </Button>

          <BookSectionSelector
            level={route.level}
            tests={tests}
            loading={loadingList}
            onSelectSection={(variant, section) => {
              router.push(buildDelfListRoute(route.level, variant, section))
            }}
            onBack={() => router.push(DELF_PRACTICE_ROOT)}
          />
        </div>
      </div>
    )
  }

  if (route.kind === "test") {
    return (
      <div className={commonShell}>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          <Button
            type="button"
            variant="ghost"
            className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
            onClick={() => router.push("/learning/workspace")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour à l&apos;espace d&apos;entrainement
          </Button>

          {currentTest ? (
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
              onRestartTest={restartCurrentTest}
              onBackToList={() => router.push(buildDelfListRoute(route.level, route.variant, route.section))}
              onBackToRoot={() => router.push(DELF_PRACTICE_ROOT)}
            />
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    </div>
  )
}
