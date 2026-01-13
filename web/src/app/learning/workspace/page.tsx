"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SessionWorkspace } from "@/components/learning/session/session-workspace"
import { useRecentSessions } from "@/lib/hooks/use-recent-sessions"
import { StartSessionModal } from "@/components/learning/session/start-session-modal"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Play,
  Clock,
  RefreshCw,
  Layers,
  Type,
  List,
  TrendingUp,
  Award,
} from "lucide-react"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { listTranscriptDrafts, type TranscriptDraft, deleteTranscriptDraft } from "@/lib/db/transcript-drafts"

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useLearningLang()
  const {
    sessions,
    isLoading,
    isRefreshing,
    refreshSessions,
    loadMoreSessions,
    isLoadingMore,
    hasMore,
  } = useRecentSessions(lang)
  const [isStartOpen, setIsStartOpen] = useState(false)
  const forceEditor = searchParams.get("open") === "editor"
  const { dialog } = useConfirmationDialog()

  const [drafts, setDrafts] = useState<TranscriptDraft[]>([])
  const [draftsLoaded, setDraftsLoaded] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [hasChosenDraft, setHasChosenDraft] = useState(false)

  useEffect(() => {
    if (!forceEditor) return

    let cancelled = false
    const loadDrafts = async () => {
      try {
        const result = await listTranscriptDrafts(lang)
        if (cancelled) return
        setDrafts(result)
        // If no drafts, immediately start a fresh workspace.
        if (result.length === 0) {
          setSelectedDraftId(null)
          setHasChosenDraft(true)
        }
      } finally {
        if (!cancelled) {
          setDraftsLoaded(true)
        }
      }
    }

    void loadDrafts()
    return () => {
      cancelled = true
    }
  }, [forceEditor, lang])

  // Dictation workspace is opened explicitly via ?open=editor
  if (forceEditor) {
    return (
      <ProtectedRoute>
        {!draftsLoaded || (!hasChosenDraft && drafts.length > 0) ? (
          <DictationDraftChooser
            drafts={drafts}
            onUseDraft={id => {
              setSelectedDraftId(id)
              setHasChosenDraft(true)
            }}
            onStartNew={() => {
              setSelectedDraftId(null)
              setHasChosenDraft(true)
            }}
            onDeleteDraft={async id => {
              await deleteTranscriptDraft(id)
              setDrafts(prev => prev.filter(d => d.id !== id))
            }}
            onCancel={() => router.push("/learning/workspace")}
          />
        ) : (
          <SessionWorkspace initialDraftId={selectedDraftId} />
        )}
      </ProtectedRoute>
    )
  }

  const totalSessions = sessions.length
  const lastSession = sessions[0]
  const lastSessionLabel = lastSession
    ? new Date(lastSession.updatedAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Your Learning Space</h1>
                <p className="text-base text-muted-foreground">
                  Continue your language journey with structured practice sessions
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSessions}
                disabled={isLoading || isRefreshing}
                className="gap-2 hover:bg-accent bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${(isLoading || isRefreshing) ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Layers className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold tracking-tight">{totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                    <p className="text-2xl font-bold tracking-tight">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Last Activity</p>
                    <p className="text-lg font-semibold tracking-tight">{lastSessionLabel || "No sessions yet"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Activities */}
          <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <CardTitle>Learning Activities</CardTitle>
              </div>
              <CardDescription>Choose a module to practice specific skills and track your progress</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Dictation Activity */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
                <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <Type className="h-16 w-16 text-primary" />
                </div>
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Type className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Dictation Practice</h3>
                      <p className="text-xs text-muted-foreground">Listening & Spelling</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Listen or read content and retype it to improve your listening comprehension and spelling accuracy.
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push("/learning/workspace?open=editor")}
                  >
                    <Play className="h-4 w-4" />
                    Start Dictation
                  </Button>
                </div>
              </div>

              {/* Numbers Activity */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
                <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <List className="h-16 w-16 text-primary" />
                </div>
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <List className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Numbers Dictation</h3>
                      <p className="text-xs text-muted-foreground">Years, phone numbers, prices</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Hear numbers spoken in French and type only the digits you recognize to sharpen real-world listening skills.
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push("/learning/numbers-dictation")}
                  >
                    <Play className="h-4 w-4" />
                    Start Numbers Dictation
                  </Button>
                </div>
              </div>

              {/* CO/CE Practice Activity */}
              <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
                <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <svg className="h-16 w-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">CO/CE Practice</h3>
                      <p className="text-xs text-muted-foreground">Listening & Reading Comprehension</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Practice French listening and reading comprehension with authentic audio exercises and questions at B1-C2 levels.
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push("/learning/coce-practice")}
                  >
                    <Play className="h-4 w-4" />
                    Start CO/CE Practice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <StartSessionModal open={isStartOpen} onOpenChange={setIsStartOpen} />
        {dialog}
      </div>
    </ProtectedRoute>
  )
}

function DictationDraftChooser({
  drafts,
  onUseDraft,
  onStartNew,
  onDeleteDraft,
  onCancel,
}: {
  drafts: TranscriptDraft[]
  onUseDraft: (id: string) => void
  onStartNew: () => void
  onDeleteDraft: (id: string) => Promise<void>
  onCancel: () => void
}) {
  const hasDrafts = drafts.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-xl">
        <Card className="border-border/60 bg-card/95 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base md:text-lg">
              <span>Dictation drafts</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Your dictation is auto-saved locally every 5 seconds and kept for 7 days.
              Once you save to the cloud, a backup copy is kept on this device for 1 day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDrafts ? (
              <div className="space-y-2 max-h-60 overflow-auto">
                {drafts.map(draft => {
                  const updatedLabel = new Date(draft.updatedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  const preview = draft.transcript?.slice(0, 120) || ""
                  return (
                    <div
                      key={draft.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {draft.title || "Untitled draft"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{updatedLabel}</p>
                        {preview && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {preview}
                            {draft.transcript.length > 120 ? "…" : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onUseDraft(draft.id)}
                        >
                          Continue
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                          onClick={() => onDeleteDraft(draft.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground">
                No local dictation drafts found for this language. Start a new transcript to begin.
              </p>
            )}

            <div className="flex justify-between pt-2 border-t mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs md:text-sm"
                onClick={onCancel}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 text-xs md:text-sm"
                  onClick={onStartNew}
                >
                  Start new transcript
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
