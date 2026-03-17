"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SessionWorkspace } from "@/components/learning/session/session-workspace"
import { useRecentSessions } from "@/lib/hooks/use-recent-sessions"
import { StartSessionModal } from "@/components/learning/session/start-session-modal"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { GuestLockedOverlay } from "@/components/auth/guest-locked-overlay"
import {
  Clock,
  Layers,
  Type,
  List,
  MessageSquare,
  ClipboardList,
  FileAudio,
  Sparkles,
} from "lucide-react"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { listTranscriptDrafts, type TranscriptDraft, deleteTranscriptDraft } from "@/lib/db/transcript-drafts"
import { cn } from "@/lib/utils"

const WORKSPACE_PROGRESS_KEY = "workspace_module_progress_v1"

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useLearningLang()
  const {
    sessions,
    isLoading,
    isRefreshing,
  } = useRecentSessions(lang)
  const [isStartOpen, setIsStartOpen] = useState(false)
  const forceEditor = searchParams.get("open") === "editor"
  const { dialog } = useConfirmationDialog()

  const [drafts, setDrafts] = useState<TranscriptDraft[]>([])
  const [draftsLoaded, setDraftsLoaded] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [hasChosenDraft, setHasChosenDraft] = useState(false)
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_PROGRESS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, number>
      setModuleProgress(parsed)
    } catch {
      // ignore
    }
  }, [])

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

  const activeModules = 5

  const workspaceModules = [
    {
      id: "dictation",
      title: "Dictée",
      description: "Travaillez l’écoute et la restitution sur texte réel.",
      path: "/learning/workspace?open=editor",
      icon: Type,
      iconTone: "text-teal-700",
      iconBg: "bg-teal-50",
      borderTone: "hover:border-teal-200",
      tags: ["#Écoute", "#Orthographe"],
      guestAllowed: false,
    },
    {
      id: "numbers",
      title: "Dictée de nombres",
      description: "Affûtez votre oreille sur dates, prix et chiffres rapides.",
      path: "/learning/numbers-dictation",
      icon: List,
      iconTone: "text-indigo-700",
      iconBg: "bg-indigo-50",
      borderTone: "hover:border-indigo-200",
      tags: ["#Listening", "#Speed"],
      guestAllowed: true,
    },
    {
      id: "coce",
      title: "CO/CE Practice",
      description: "Travaillez la compréhension sur des formats guidés.",
      path: "/learning/coce-practice",
      icon: FileAudio,
      iconTone: "text-slate-700",
      iconBg: "bg-slate-100",
      borderTone: "hover:border-slate-300",
      tags: ["Niveaux A2-B2", "#Compréhension"],
      guestAllowed: true,
    },
    {
      id: "speaking",
      title: "Pratique orale",
      description: "Répondez à des prompts structurés et gagnez en fluidité.",
      path: "/learning/speaking-practice",
      icon: MessageSquare,
      iconTone: "text-teal-700",
      iconBg: "bg-teal-50",
      borderTone: "hover:border-teal-200",
      tags: ["#Oral", "#Guidé"],
      guestAllowed: true,
    },
    {
      id: "delf",
      title: "DELF Practice",
      description: "Simulez des formats d’examen avec une structure claire.",
      path: "/learning/delf-practice",
      icon: ClipboardList,
      iconTone: "text-indigo-700",
      iconBg: "bg-indigo-50",
      borderTone: "hover:border-indigo-200",
      tags: ["Niveaux A2-B2", "#Examen"],
      guestAllowed: true,
    },
  ]

  const statCards = [
    {
      label: "Sessions",
      value: isLoading || isRefreshing ? "..." : `${totalSessions}`,
      icon: Layers,
      iconTone: "text-slate-700",
      iconBg: "bg-slate-100",
    },
    {
      label: "Modules",
      value: `${activeModules}`,
      icon: Sparkles,
      iconTone: "text-indigo-700",
      iconBg: "bg-indigo-50",
    },
    {
      label: "Dernière activité",
      value: lastSessionLabel || "Aucune",
      icon: Clock,
      iconTone: "text-teal-700",
      iconBg: "bg-teal-50",
    },
  ]

  const handleOpenModule = (moduleId: string, path: string) => {
    setModuleProgress((prev) => {
      const nextValue = Math.min(100, (prev[moduleId] || 0) + 15)
      const next = { ...prev, [moduleId]: nextValue }
      try {
        window.localStorage.setItem(WORKSPACE_PROGRESS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    router.push(path)
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
              Bibliothèque de modules
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Espace d’entraînement
            </h1>
            <p className="text-sm text-slate-500">
              Choisissez un format de pratique et relancez votre progression en un clic.
            </p>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{stat.value}</p>
                </div>
                <div className={cn("rounded-2xl p-2.5", stat.iconBg, stat.iconTone)}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceModules.map((module) => {
              const progress = moduleProgress[module.id] || 10
              return (
                <GuestLockedOverlay key={module.id} allowed={module.guestAllowed}>
                  <button
                    onClick={() => handleOpenModule(module.id, module.path)}
                    className={cn(
                      "group relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 text-left shadow-sm transition-all duration-200 w-full",
                      "hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] active:scale-[0.99]",
                      module.borderTone
                    )}
                  >
                    <div className="pointer-events-none absolute right-3 top-3 opacity-[0.08] transition group-hover:opacity-[0.14]">
                      <module.icon className={cn("h-24 w-24", module.iconTone)} />
                    </div>

                    <div className="relative flex h-full min-h-[220px] flex-col">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className={cn("rounded-[18px] p-3", module.iconBg, module.iconTone)}>
                          <module.icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {module.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">
                          {module.title}
                        </h2>
                        <p className="max-w-[36ch] text-sm leading-6 text-slate-500">
                          {module.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-6" />
                    </div>
                  </button>
                </GuestLockedOverlay>
              )
            })}
          </div>
      </div>

        <StartSessionModal open={isStartOpen} onOpenChange={setIsStartOpen} />
        {dialog}
    </div>
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
