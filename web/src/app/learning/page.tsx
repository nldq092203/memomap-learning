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
import {
  Play,
  BookOpen,
  Mic,
  Layers,
  HelpCircle,
  Timer,
  Flame,
  Clock,
} from "lucide-react"
import { StartSessionModal } from "@/components/learning/session/start-session-modal"
import { learningApi } from "@/lib/services/learning-api"
import { analyticsCache } from "@/lib/services/analytics-cache"
import type { LearningAnalytics } from "@/lib/types/learning-vocab"
import { ActivityLineChart } from "@/components/learning/analytics/activity-line-chart"
import { BottomDock, type DockAction } from "@/components/learning/layout/bottom-dock"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { ShortcutPanel } from "@/components/ui/shortcut-panel"
import { FeatureGuideModal } from "@/components/learning/layout/feature-guide-modal"
import { useLearningTimeSession } from "@/lib/contexts/learning-time-session-context"
import { useRecentSessions } from "@/lib/hooks/use-recent-sessions"
import { cn } from "@/lib/utils"

export default function LearningPage() {
  const router = useRouter()
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const { lang: selectedLanguage } = useLearningLang()
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [chartDays, setChartDays] = useState<7 | 30>(30)
  const { isActive: sessionIsActive } = useLearningTimeSession()
  const { sessions, isLoading: sessionsLoading } = useRecentSessions(selectedLanguage)

  const dockActions: DockAction[] = [
    { label: "Révision", hint: "R", icon: BookOpen, onClick: () => router.push("/learning/review-hub") },
    { label: "Entraînement", hint: "T", icon: Layers, onClick: () => router.push("/learning/workspace") },
    { label: "Transcrire", hint: "D", icon: Mic, onClick: () => router.push("/learning/transcribe") },
    { label: "Session", hint: "S", icon: Timer, onClick: () => setIsStartOpen(true) },
  ]

  useEffect(() => {
    let cancelled = false
    const cached = analyticsCache.get(selectedLanguage)
    if (cached) {
      setAnalytics(cached)
      setIsLoadingAnalytics(false)
    } else {
      setIsLoadingAnalytics(false)
    }
    ;(async () => {
      try {
        const data = await learningApi.getAnalytics(selectedLanguage, 30, 0)
        if (!cancelled) {
          setAnalytics(data)
          analyticsCache.set(selectedLanguage, data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load analytics:", error)
        }
      }
    })()
    return () => { cancelled = true }
  }, [selectedLanguage])

  const todaysMinutes = analytics?.today_minutes || 0
  const dailyMinutesTarget = 30
  const currentStreak = analytics?.current_streak_days || 0

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-28">
        {/* Header — compact, non-distracting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">
              Tableau de bord
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Votre parcours</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGuideOpen(true)}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-full"
            >
              <HelpCircle className="h-3 w-3" />
              Guide
            </Button>
            <ShortcutPanel />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            BENTO GRID
            ═══════════════════════════════════════════════ */}
        <div className="space-y-4">
          {isLoadingAnalytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="h-44 lg:col-span-2 animate-pulse rounded-2xl bg-muted/30" />
              <div className="h-44 animate-pulse rounded-2xl bg-muted/30" />
            </div>
          ) : (
            <>
              {/* ── Row 1: Hero Session (2/3) + Progress (1/3) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Hero Session Card */}
                <Card
                  className={cn(
                    "lg:col-span-2 relative overflow-hidden border transition-all duration-500",
                    sessionIsActive
                      ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg shadow-primary/10"
                      : "border-border/60 bg-gradient-to-br from-muted/30 via-background to-background",
                  )}
                >
                  {/* Ambient glow when session active */}
                  {sessionIsActive && (
                    <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl animate-pulse pointer-events-none" />
                  )}

                  <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary/80">
                        <Timer className="h-3 w-3" />
                        {sessionIsActive ? "Session en cours" : "Session d'apprentissage"}
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                        {sessionIsActive ? "Focus mode 🎯" : "Prêt pour une session ?"}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                        {sessionIsActive
                          ? "Votre chronomètre tourne. Continuez votre apprentissage !"
                          : "Lancez le chrono pour enregistrer votre temps d'étude."}
                      </p>
                    </div>
                    {!sessionIsActive && (
                      <Button
                        size="lg"
                        onClick={() => setIsStartOpen(true)}
                        className="rounded-full px-7 shadow-md shadow-primary/15 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
                      >
                        <Play className="h-4 w-4 mr-2" /> Démarrer
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Progress / Stats Card */}
                <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 flex flex-col justify-center h-full gap-5">
                    {/* Streak */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                        <Flame className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold leading-none">{currentStreak}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {currentStreak === 1 ? "jour consécutif" : "jours consécutifs"}
                        </p>
                      </div>
                    </div>

                    {/* Daily Goal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Objectif du jour</span>
                        <span className="font-semibold text-foreground">
                          {todaysMinutes}/{dailyMinutesTarget} min
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, (todaysMinutes / dailyMinutesTarget) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Row 2: Shortcut Cards (3 cols) ── */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Vocabulaire", icon: BookOpen, path: "/learning/vocab", color: "text-emerald-500", borderHover: "hover:border-emerald-500/40" },
                  { label: "Entraînement", icon: Layers, path: "/learning/workspace", color: "text-purple-500", borderHover: "hover:border-purple-500/40" },
                  { label: "Transcrire", icon: Mic, path: "/learning/transcribe", color: "text-pink-500", borderHover: "hover:border-pink-500/40" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.path)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
                      "px-4 py-4 text-left transition-all duration-200",
                      "hover:bg-card/80 hover:shadow-sm active:scale-[0.98]",
                      action.borderHover,
                    )}
                  >
                    <div className={cn("p-2 rounded-xl bg-muted/50", action.color, "group-hover:scale-110 transition-transform")}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Row 3: Chart (2/3) + Recent Sessions (1/3) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Activity Chart */}
                <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
                    <div>
                      <CardTitle className="text-sm font-semibold">Activité</CardTitle>
                      <CardDescription className="text-[11px]">Votre régularité au fil du temps</CardDescription>
                    </div>
                    <div className="flex items-center bg-muted/60 rounded-lg p-0.5 text-[11px]">
                      <button
                        onClick={() => setChartDays(7)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all",
                          chartDays === 7 ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        7j
                      </button>
                      <button
                        onClick={() => setChartDays(30)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all",
                          chartDays === 30 ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        30j
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 px-2 sm:px-5 pb-4">
                    {analytics ? (
                      <div className="h-[200px] w-full">
                        <ActivityLineChart daily={analytics.daily ?? []} days={chartDays} />
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                        Les données apparaîtront après votre première session.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Sessions */}
                <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-semibold">Sessions récentes</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-2 max-h-[240px] overflow-y-auto">
                    {sessionsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/30" />
                        ))}
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Votre première session<br />apparaîtra ici.
                        </p>
                      </div>
                    ) : (
                      sessions.slice(0, 4).map((session) => {
                        const minutes = Math.max(1, Math.round((session.duration || 0) / 60))
                        return (
                          <div
                            key={session.id}
                            className="flex items-center gap-3 rounded-xl border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{session.title || "Session"}</p>
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                              {minutes} min
                            </span>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        <BottomDock actions={dockActions} />
        <StartSessionModal open={isStartOpen} onOpenChange={setIsStartOpen} />
        <FeatureGuideModal open={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    </ProtectedRoute>
  )
}
