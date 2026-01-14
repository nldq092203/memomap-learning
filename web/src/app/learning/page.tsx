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
import { useOnboarding } from "@/lib/contexts/onboarding-context"
import { ShortcutPanel } from "@/components/ui/shortcut-panel"

export default function LearningPage() {
  const router = useRouter()
  const [isStartOpen, setIsStartOpen] = useState(false)
  const { lang: selectedLanguage } = useLearningLang()
  const { isCompleted: onboardingCompleted, preferences } = useOnboarding()
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [chartDays, setChartDays] = useState<7 | 30>(30)

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!onboardingCompleted) {
      router.push("/onboarding")
    }
  }, [onboardingCompleted, router])

  // Use user's personalized daily goal, fallback to 30 minutes
  const dailyMinutesTarget = preferences?.dailyGoal || 30
  
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
        <TabsContent value="dashboard" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoadingAnalytics ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-64 lg:col-span-2 animate-pulse rounded-3xl bg-muted/40" />
              <div className="h-64 animate-pulse rounded-3xl bg-muted/40" />
            </div>
          ) : (
            <>
              {/* Momentum Section */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-1 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-primary/10 shadow-lg">
                  <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                    <div className="space-y-6 flex-1 text-center md:text-left z-10">
                      <div>
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                           <Sparkles className="h-3 w-3" />
                           Daily Progress
                         </div>
                         <h2 className="text-3xl font-bold tracking-tight mb-2">
                           {todaysMinutes >= dailyMinutesTarget ? "Goal Crushed! 🎉" : "Keep Learning!"}
                         </h2>
                         <p className="text-muted-foreground text-lg">
                           You&apos;ve done <span className="text-foreground font-semibold">{todaysMinutes} min</span> of your {dailyMinutesTarget} min goal.
                         </p>
                      </div>

                      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <Button 
                          size="lg"
                          onClick={() => setIsStartOpen(true)}
                          className="rounded-full px-8 shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                        >
                          <Play className="h-4 w-4 mr-2" /> Start Session
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Momentum Ring */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="relative h-40 w-40">
                         {/* Background blur for glow */}
                         <div className="absolute inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
                         <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                           <circle
                             cx="80" cy="80" r="72"
                             stroke="currentColor" strokeWidth="12" fill="transparent"
                             className="text-muted/20"
                           />
                           <circle
                             cx="80" cy="80" r="72"
                             stroke="currentColor" strokeWidth="12" fill="transparent"
                             strokeDasharray={2 * Math.PI * 72}
                             strokeDashoffset={(2 * Math.PI * 72) * (1 - momentumPercent / 100)}
                             strokeLinecap="round"
                             className="text-primary transition-all duration-1000 ease-out"
                           />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                           <span className="text-3xl font-bold tracking-tighter">{momentumPercent}%</span>
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats Column */}
                <div className="space-y-4">
                   <div className="grid grid-cols-2 md:grid-cols-1 gap-4 h-full">
                      <Card className="flex flex-col justify-center p-6 bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/50">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                             <Flame className="h-5 w-5" />
                           </div>
                           <span className="text-sm font-medium text-muted-foreground">Streak</span>
                        </div>
                        <p className="text-3xl font-bold">{currentStreak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Best: <span className="font-medium">{longestStreak} days</span></p>
                      </Card>

                      <Card className="flex flex-col justify-center p-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50">
                         <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                             <TrendingUp className="h-5 w-5" />
                           </div>
                           <span className="text-sm font-medium text-muted-foreground">Avg. Time</span>
                        </div>
                        <p className="text-3xl font-bold">{analytics?.avg_minutes_7d || 0} <span className="text-sm font-normal text-muted-foreground">min</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                      </Card>
                   </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {[
                   { label: "Vocabulary", icon: BookOpen, path: "/learning/vocab", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                   { label: "Workspace", icon: Layers, path: "/learning/workspace", color: "text-purple-500", bg: "bg-purple-500/10" },
                   { label: "Transcribe", icon: Mic, path: "/learning/transcribe", color: "text-pink-500", bg: "bg-pink-500/10" }
                 ].map((action) => (
                   <button
                     key={action.label}
                     onClick={() => router.push(action.path)}
                     className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                   >
                     <div className={`p-3 rounded-xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                       <action.icon className="h-6 w-6" />
                     </div>
                     <span className="text-sm font-medium">{action.label}</span>
                   </button>
                 ))}
              </div>

              {/* Analytics Diagram */}
              {analytics && (
                <Card className="overflow-hidden border-none shadow-md bg-gradient-to-b from-card to-muted/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">Learning Activity</CardTitle>
                      <CardDescription>Your consistency over time</CardDescription>
                    </div>
                    <div className="flex items-center bg-muted rounded-lg p-1 text-xs">
                       <button
                         onClick={() => setChartDays(7)}
                         className={`px-3 py-1 rounded-md transition-all ${chartDays === 7 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                       >
                         7 Days
                       </button>
                       <button
                         onClick={() => setChartDays(30)}
                         className={`px-3 py-1 rounded-md transition-all ${chartDays === 30 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                       >
                         30 Days
                       </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 px-2 sm:px-6">
                    <div className="h-[300px] w-full">
                      <ActivityLineChart daily={analytics.daily ?? []} days={chartDays} />
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
