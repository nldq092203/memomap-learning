"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Flame,
  Play,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Target,
  Pencil,
  Mic,
  Layers,
} from "lucide-react"
import { StartSessionModal } from "@/components/learning/session/start-session-modal"
import { learningApi } from "@/lib/services/learning-api"
import { analyticsCache } from "@/lib/services/analytics-cache"
import type { LearningAnalytics } from "@/lib/types/learning-vocab"
import { ActivityLineChart } from "@/components/learning/analytics/activity-line-chart"
import { WorkspaceShelf } from "@/components/learning/session/workspace-shelf"
import { BottomDock, type DockAction } from "@/components/learning/layout/bottom-dock"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { ShortcutPanel } from "@/components/ui/shortcut-panel"

export default function LearningPage() {
  const router = useRouter()
  const [isStartOpen, setIsStartOpen] = useState(false)
  const { lang: selectedLanguage } = useLearningLang()
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [chartDays, setChartDays] = useState<7 | 30>(30)

  const dailyMinutesTarget = 30
  const dockActions: DockAction[] = [
    { label: "Review", hint: "R", icon: BookOpen, onClick: () => router.push("/learning/review-hub") },
    { label: "Training", hint: "T", icon: Layers, onClick: () => router.push("/learning/workspace") },
    { label: "Transcribe", hint: "R", icon: Mic, onClick: () => router.push("/learning/transcribe") },
    { label: "Create Session", hint: "C", icon: Pencil, onClick: () => setIsStartOpen(true) },
  ]

  useEffect(() => {
    let cancelled = false
    // 1) Load cached analytics immediately (if any)
    const cached = analyticsCache.get(selectedLanguage)
    if (cached) {
      setAnalytics(cached)
      setIsLoadingAnalytics(false)
    } else {
      // Show default UI quickly
      setIsLoadingAnalytics(false)
    }
    // 2) Fetch fresh analytics in background
    ;(async () => {
      try {
        const data = await learningApi.getAnalytics(selectedLanguage, 30, 0)
        if (!cancelled) {
          setAnalytics(data)
          analyticsCache.set(selectedLanguage, data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load analytics:', error)
        }
      }
    })()
    return () => { cancelled = true }
  }, [selectedLanguage])

  const todaysMinutes = analytics?.today_minutes || 0
  const momentumPercent = Math.min(100, Math.round((todaysMinutes / dailyMinutesTarget) * 100))
  const currentStreak = analytics?.current_streak_days || 0
  const longestStreak = analytics?.longest_streak_days || 0

  return (
    <ProtectedRoute>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 pb-24 md:pb-28 text-sm md:text-base">
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground">
            Learning Dashboard
          </p>
          <h1 className="text-2xl md:text-4xl font-semibold">Your Learning Journey</h1>
        </div>
        <ShortcutPanel />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <TabsContent value="dashboard" className="space-y-8">
          {isLoadingAnalytics ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl bg-muted/40" />
              ))}
            </div>
          ) : (
            <>
              {/* Momentum Card */}
              <Card className="relative overflow-hidden border-0 bg-primary/10 shadow-lg">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-4 max-w-xl">
                      <div className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-wide text-primary">
                        <Sparkles className="h-4 w-4" />
                        Today&apos;s Progress
                      </div>
                      <p className="text-lg md:text-2xl font-semibold leading-snug md:leading-tight">
                        {todaysMinutes > 0
                          ? `Great work! You've completed ${todaysMinutes} minutes today.`
                          : `Ready to start? Set your daily goal at ${dailyMinutesTarget} minutes.`}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-3 md:p-4">
                          <p className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wide">Today</p>
                          <p className="text-base md:text-lg font-semibold">{todaysMinutes} min</p>
                          <p className="text-[11px] md:text-xs text-muted-foreground">of {dailyMinutesTarget} min</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-3 md:p-4">
                          <p className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wide">7-Day Avg</p>
                          <p className="text-base md:text-lg font-semibold">{analytics?.avg_minutes_7d || 0} min</p>
                          <p className="text-[11px] md:text-xs text-muted-foreground">per day</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-3 md:p-4">
                          <p className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wide">30-Day Avg</p>
                          <p className="text-base md:text-lg font-semibold">{analytics?.avg_minutes_30d || 0} min</p>
                          <p className="text-[11px] md:text-xs text-muted-foreground">per day</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <Button
                          size="sm"
                          onClick={() => setIsStartOpen(true)}
                          className="gap-2 md:px-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                        >
                          <Play className="h-4 w-4" />
                          <span className="hidden sm:inline">Start Session</span>
                          <span className="sm:hidden">Start</span>
                        </Button>
                        <Button
                          variant="link"
                          className="text-xs md:text-sm px-0"
                          onClick={() => router.push("/learning/review-hub")}
                        >
                          Review Vocabulary <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40">
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(var(--primary) ${momentumPercent}%, hsl(var(--muted)) ${momentumPercent}%)`,
                            opacity: 0.9,
                          }}
                        />
                        <div className="absolute inset-4 rounded-full bg-background/90 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl md:text-3xl font-semibold">{momentumPercent}%</span>
                          <p className="text-[11px] md:text-xs text-muted-foreground">
                            {todaysMinutes} / {dailyMinutesTarget}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Streak & Stats Grid */}
              <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Current Streak */}
                <Card className="border border-primary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                      <Flame className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                      Current Streak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-3xl md:text-4xl font-bold">{currentStreak}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {currentStreak === 1 ? 'day' : 'days'} in a row
                      </p>
                      <Progress value={longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 0} className="h-2" />
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        Best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Sessions This Month */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-3xl md:text-4xl font-bold">
                        {analytics?.daily?.reduce((sum, day) => sum + day.sessions, 0) || 0}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">total sessions</p>
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        {analytics?.daily?.reduce((sum, day) => sum + day.minutes, 0) || 0} minutes total
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-sm md:text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 text-xs md:text-sm h-9 md:h-10"
                      onClick={() => router.push("/learning/workspace")}
                    >
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                      Workspace
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 text-xs md:text-sm h-9 md:h-10"
                      onClick={() => router.push("/learning/vocab")}
                    >
                      <Target className="h-4 w-4 md:h-5 md:w-5" />
                      Vocabulary
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 text-xs md:text-sm h-9 md:h-10"
                      onClick={() => router.push("/learning/review-hub")}
                    >
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                      Review Hub
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Chart */}
              {analytics && Array.isArray(analytics.daily) && analytics.daily.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          Activity Over Time
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          {chartDays} days of learning activity
                        </CardDescription>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-md border p-1 text-[11px] md:text-xs">
                        <button
                          type="button"
                          className={`px-2 py-1 rounded font-medium transition ${chartDays === 7 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          onClick={() => setChartDays(7)}
                        >
                          7d
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 rounded font-medium transition ${chartDays === 30 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          onClick={() => setChartDays(30)}
                        >
                          30d
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ActivityLineChart daily={analytics.daily ?? []} days={chartDays} />
                    <div className="mt-3 flex items-center gap-3 text-[11px] md:text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Minutes</div>
                      <div className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Sessions</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <WorkspaceShelf language={selectedLanguage} />
            </>
          )}
        </TabsContent>

        <TabsContent value="transcribe">
          <div className="rounded-3xl border bg-card/80 p-4 sm:p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Open the full transcription workspace to record or upload audio and generate transcripts.
            </p>
            <Button
              variant="default"
              className="gap-2"
              onClick={() => router.push("/learning/transcribe")}
            >
              <Mic className="h-4 w-4" />
              Go to Transcribe
            </Button>
          </div>
        </TabsContent>

      </Tabs>

      <BottomDock actions={dockActions} />
      <StartSessionModal open={isStartOpen} onOpenChange={setIsStartOpen} />
    </div>
    </ProtectedRoute>
  )
}
