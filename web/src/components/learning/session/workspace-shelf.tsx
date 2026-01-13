"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Clock, Trash2 } from "lucide-react"
import { useRecentSessions } from "@/lib/hooks/use-recent-sessions"
import type { LearningLanguage } from "@/lib/services/learning-api"
import type { SessionSummary } from "@/lib/types/learning-session"
import { learningApi } from "@/lib/services/learning-api"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"

export function WorkspaceShelf({ language }: { language: LearningLanguage }) {
  const { sessions, isLoading, isRefreshing, refreshSessions } =
    useRecentSessions(language)
  const { confirm, dialog, setLoading } = useConfirmationDialog()

  const handleDeleteSession = (session: SessionSummary) => {
    confirm({
      title: "Delete session",
      description:
        `Are you sure you want to delete "${session.title || "this session"}"?\n` +
        "This action cannot be undone and will remove it from your history.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: () => {
        void (async () => {
          setLoading(true)
          try {
            await learningApi.deleteSession(session.id, session.language as LearningLanguage)
            await refreshSessions()
          } catch (error) {
            console.error("Failed to delete session:", error)
          } finally {
            setLoading(false)
          }
        })()
      },
    })
  }

  return (
    <Card className="bg-card/80 text-sm md:text-base">
      <CardHeader className="flex flex-row items-center justify-between gap-2 md:gap-4 py-3 md:py-4">
        <div>
          <CardTitle className="text-sm md:text-base">Recent Sessions</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Review your recent learning sessions
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-8 md:w-8"
          onClick={() => refreshSessions()}
        >
          <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[320px] md:max-h-[360px] overflow-auto pr-1">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        )}
        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No sessions yet. Start one to see it here.
          </div>
        )}
        {sessions.slice(0, 5).map((session) => {
          const minutes = Math.max(1, Math.round(((session.duration || 0) / 60) || 0))
          const accessedLabel = session.lastAccessedAt
            ? new Date(session.lastAccessedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now"
          return (
            <div
              key={session.id}
              className="rounded-2xl border border-border/60 p-3 md:p-4 transition bg-background/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm md:text-base font-medium">{session.title}</p>
                  <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5">
                      {session.language?.toUpperCase() || "N/A"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 md:mt-2 flex items-center gap-3 md:gap-4 text-[11px] md:text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {minutes} min
                    </span>
                    <span>Last accessed: {accessedLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session)
                    }}
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
      {dialog}
    </Card>
  )
}
