"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  learningApi,
  type AudioLessonDetail,
  type AudioLessonListItem,
  type LearningLanguage,
} from "@/lib/services/learning-api"
import { notificationService } from "@/lib/services/notification-service"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { SessionTabProvider } from "@/lib/contexts/session-tab-context"
import { AudioLessonPreviewWindow } from "@/components/learning/audio/audio-lesson-preview-window"
import {
  SourceSelector,
  type WorkspaceSourceMode,
} from "@/components/learning/workspace/source-selector"
import { DictationPanel } from "@/components/learning/workspace/dictation-panel"
import { SidebarTabs } from "@/components/learning/workspace/sidebar-tabs"
import type { TranscriptEditorHandle } from "@/components/learning/editor/transcript-editor"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import {
  deleteTranscriptDraft,
  loadTranscriptDraft,
  saveTranscriptDraft,
} from "@/lib/db/transcript-drafts"
import type { LearningSession, LocalVocabCard } from "@/lib/types/learning-session"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Focus,
  Headphones,
  Library,
  Save,
} from "lucide-react"

interface SessionWorkspaceProps {
  initialDraftId?: string | null
}

export function SessionWorkspace({ initialDraftId }: SessionWorkspaceProps) {
  const router = useRouter()
  const { lang } = useLearningLang()
  const { confirm, dialog, setLoading } = useConfirmationDialog()

  const [draftId] = useState(() => initialDraftId || `dictation-${lang}-${Date.now()}`)

  // Local draft state (transcript + notes only)
  const [sessionDraft, setSessionDraft] = useState<{ transcript: string; notes: string[] }>({
    transcript: "",
    notes: [],
  })

  // Metadata for comments/tags/title etc.
  const [sessionMeta, setSessionMeta] = useState<{
    id: string
    title: string
    comments: string[]
    tags: string[]
    createdAt: string | null
    updatedAt: string | null
  }>({
    id: draftId,
    title: "Dictee",
    comments: [],
    tags: [],
    createdAt: null,
    updatedAt: null,
  })

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [vocabCards, setVocabCards] = useState<LocalVocabCard[]>([])

  // Local UI state
  const [sourceUrl, setSourceUrl] = useState("")
  const [isSavingToCloud, setIsSavingToCloud] = useState(false)
  const [sourceMode, setSourceMode] = useState<WorkspaceSourceMode>("dictation")
  const [audioLessons, setAudioLessons] = useState<AudioLessonListItem[]>([])
  const [audioLessonsLoading, setAudioLessonsLoading] = useState(false)
  const [audioLessonsError, setAudioLessonsError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [lessonDetail, setLessonDetail] = useState<AudioLessonDetail | null>(null)
  const [showLessonWindow, setShowLessonWindow] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  const editorRef = useRef<TranscriptEditorHandle | null>(null)
  // Hydrate draft from IndexedDB for current language
  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const existing = await loadTranscriptDraft(draftId)
      if (cancelled) return

      if (existing) {
        setSessionMeta({
          id: existing.id,
          title: existing.title || "Dictee",
          comments: existing.comments || [],
          tags: existing.tags || [],
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        })
        setSessionDraft({
          transcript: existing.transcript || "",
          notes: existing.notes || [],
        })
        setSourceUrl(existing.sourceUrl || "")
        setLastSavedAt(Date.now())
      } else {
        setSessionMeta({
          id: draftId,
          title: "Dictee",
          comments: [],
          tags: [],
          createdAt: null,
          updatedAt: null,
        })
        setSessionDraft({ transcript: "", notes: [] })
        setSourceUrl("")
        setLastSavedAt(null)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [draftId])

  // Autosave draft to IndexedDB with TTL
  useEffect(() => {
    const hasContent =
      sessionDraft.transcript.trim().length > 0 ||
      sessionDraft.notes.length > 0 ||
      sourceUrl.trim().length > 0 ||
      sessionMeta.comments.length > 0 ||
      sessionMeta.tags.length > 0

    if (!hasContent) return

    let cancelled = false
    const intervalId = setInterval(async () => {
      setIsSavingDraft(true)
      try {
        const saved = await saveTranscriptDraft({
          id: sessionMeta.id || draftId,
          language: lang as LearningLanguage,
          title: sessionMeta.title || "Dictee",
          sourceUrl: sourceUrl || null,
          transcript: sessionDraft.transcript,
          notes: sessionDraft.notes,
          comments: sessionMeta.comments,
          tags: sessionMeta.tags,
        })

        if (!cancelled) {
          setSessionMeta(prev => ({
            ...prev,
            id: saved.id,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
          }))
          setLastSavedAt(Date.now())
        }
      } catch (error) {
        console.error("Failed to autosave transcript draft", error)
      } finally {
        if (!cancelled) {
          setIsSavingDraft(false)
        }
      }
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [
    draftId,
    lang,
    sessionDraft.transcript,
    sessionDraft.notes,
    sessionMeta.id,
    sessionMeta.title,
    sessionMeta.comments,
    sessionMeta.tags,
    sourceUrl,
  ])

  // Get vocabulary cards for current draft (local-only)
  const sessionVocabCards = useMemo(
    () => vocabCards,
    [vocabCards],
  )

  // Handle transcript changes (plain text)
  const handleTranscriptChange = useCallback(
    (text: string) => {
      setSessionDraft(prev => ({ ...prev, transcript: text }))
    },
    [],
  )

  const handleTitleChange = useCallback((value: string) => {
    setSessionMeta(prev => ({ ...prev, title: value }))
  }, [])

  // updateSession bridge for SessionTabProvider (comments/tags)
  const updateSession = useCallback(
    async (patch: Partial<LearningSession>) => {
      setSessionMeta(prev => ({
        ...prev,
        comments:
          patch.comments != null
            ? (patch.comments as string[])
            : prev.comments,
        tags:
          patch.tags != null ? (patch.tags as string[]) : prev.tags,
      }))
    },
    [],
  )

  // Add vocabulary card (saved directly to backend vocab collection)
  const addVocabCard = useCallback(
    async (cardData: {
      word: string
      translation: string | null
      notes: string[]
      tags: string[]
    }) => {
      const nowIso = new Date().toISOString()
      const result = await learningVocabApi.bulkImport(lang as LearningLanguage, [
        {
          word: cardData.word,
          translation: cardData.translation,
          notes: cardData.notes,
          tags: cardData.tags,
        },
      ])

      const created = result?.items?.[0]
      const card: LocalVocabCard = {
        id: created?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sessionId: sessionMeta.id || draftId,
        word: created?.word || cardData.word,
        translation: created?.translation ?? cardData.translation,
        notes: created?.notes || cardData.notes,
        tags: created?.tags || cardData.tags,
        language: created?.language || lang,
        createdAt: created?.created_at || nowIso,
        updatedAt: created?.updated_at || nowIso,
      }

      setVocabCards(prev => [...prev, card])
      return card
    },
    [lang, sessionMeta.id, draftId],
  )

  const loadAudioLessons = useCallback(async () => {
    if (!lang) {
      return []
    }

    setAudioLessonsLoading(true)
    setAudioLessonsError(null)

    try {
      const response = await learningApi.getAudioLessons(
        lang as LearningLanguage,
        50,
      )
      const lessons = response.lessons ?? []
      setAudioLessons(lessons)
      return lessons
    } catch (error) {
      console.error("Failed to load audio lessons", error)
      setAudioLessons([])
      setAudioLessonsError("Impossible de charger les audios enregistres.")
      throw error
    } finally {
      setAudioLessonsLoading(false)
    }
  }, [lang])

  // Load saved audio lessons when switching to audio-backed modes
  useEffect(() => {
    const loadLessons = async () => {
      try {
        await loadAudioLessons()
      } catch {
        // Error state is handled inside loadAudioLessons.
      }
    }

    void loadLessons()
  }, [loadAudioLessons])

  const handleOpenSelectedLesson = useCallback(() => {
    console.log("[Workspace] Open selected lesson clicked", {
      selectedLessonId,
      audioLessonsCount: audioLessons.length,
    })

    if (!selectedLessonId) {
      notificationService.info("Choisissez d'abord un audio enregistre.")
      return
    }

    const meta = audioLessons.find((lesson) => lesson.id === selectedLessonId)
    if (!meta) {
      notificationService.error("Impossible de trouver les informations de cet audio.")
      return
    }

    // Seed lesson detail with lightweight metadata; transcript will be
    // fetched lazily inside the preview window when requested.
    setLessonDetail({
      id: meta.id,
      name: meta.name,
      language: meta.language ?? null,
      durationSeconds: meta.durationSeconds ?? null,
      updatedAt: meta.updatedAt,
      transcriptFile: meta.transcriptFile,
      transcript: undefined,
      timestamps: undefined,
    } as AudioLessonDetail)
    setShowLessonWindow(true)
  }, [selectedLessonId, audioLessons])

  const handleBack = useCallback(() => {
    router.push("/learning/workspace")
  }, [router])

  const handleSourceModeChange = useCallback(
    (mode: WorkspaceSourceMode) => {
      setSourceMode(mode)
    },
    []
  )

  const handleSourceUrlChange = useCallback((value: string) => {
    setSourceUrl(value)
  }, [])

  const handleSelectLesson = useCallback((lessonId: string) => {
    setSelectedLessonId(lessonId)
  }, [])

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev)
  }, [])

  const handleToggleAudioWindow = useCallback(() => {
    console.log("[Workspace] Audio button clicked", {
      hasLessonDetail: !!lessonDetail,
      showLessonWindow,
      selectedLessonId,
    })

    // No lesson loaded yet: behave like "Open audio"
    if (!lessonDetail) {
      handleOpenSelectedLesson()
      return
    }

    // Toggle window visibility
    setShowLessonWindow(prev => !prev)
  }, [lessonDetail, handleOpenSelectedLesson, showLessonWindow, selectedLessonId])

  const session: LearningSession = useMemo(
    () => ({
      id: sessionMeta.id || draftId,
      language: lang,
      title: sessionMeta.title || "Dictee",
      duration: 0,
      status: "draft",
      startedAt: sessionMeta.createdAt || new Date().toISOString(),
      createdAt: sessionMeta.createdAt || new Date().toISOString(),
      updatedAt: sessionMeta.updatedAt || sessionMeta.createdAt || new Date().toISOString(),
      lastAccessedAt:
        sessionMeta.updatedAt || sessionMeta.createdAt || new Date().toISOString(),
      isBackedUp: false,
      sourceUrl: sourceUrl || null,
      transcript: sessionDraft.transcript,
      notes: sessionDraft.notes,
      comments: sessionMeta.comments,
      tags: sessionMeta.tags,
    }),
    [draftId, lang, sessionMeta, sessionDraft, sourceUrl],
  )

  const handleSaveTranscript = useCallback(async () => {
    const activeSerialized = editorRef.current?.serialize?.()
    const transcriptText =
      activeSerialized?.text ?? sessionDraft.transcript ?? ""

    if (!transcriptText.trim()) {
      notificationService.info("Rien a enregistrer pour le moment. Saisissez d'abord du texte.")
      return
    }

    setIsSavingToCloud(true)
    setLoading(true)

    try {
      await learningApi.createTranscript({
        language: lang as LearningLanguage,
        source_url: sourceUrl || null,
        transcript: transcriptText || null,
        notes:
          (sessionDraft.notes || []).length > 0
            ? (sessionDraft.notes || []).join("\n")
            : null,
        comments:
          (sessionMeta.comments || []).length > 0
            ? sessionMeta.comments.join("\n")
            : null,
        tags: sessionMeta.tags || [],
      })
      notificationService.success("Transcription enregistree dans le cloud")

      // Mark local draft as "saved" for short-term recovery (1 day TTL)
      await saveTranscriptDraft({
        id: sessionMeta.id || draftId,
        language: lang as LearningLanguage,
        title: sessionMeta.title || "Dictee",
        sourceUrl: sourceUrl || null,
        transcript: transcriptText,
        notes: sessionDraft.notes,
        comments: sessionMeta.comments,
        tags: sessionMeta.tags,
        status: "saved",
      })
      router.push("/learning/workspace")
    } catch (error) {
      console.error("Failed to save transcript", error)
      notificationService.error("Echec de l'enregistrement. Reessayez.")
    } finally {
      setIsSavingToCloud(false)
      setLoading(false)
    }
  }, [draftId, lang, sessionDraft, sessionMeta, sourceUrl, router, setLoading])

  const handleDiscardDraft = useCallback(() => {
    confirm({
      title: "Supprimer le brouillon ?",
      description:
        "Cette action supprime le brouillon actuel sur cet appareil. Les transcriptions deja enregistrees dans le cloud ne seront pas affectees.",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      variant: "destructive",
      onConfirm: () => {
        void (async () => {
          setLoading(true)
          try {
            await deleteTranscriptDraft(draftId)
            setSessionDraft({ transcript: "", notes: [] })
            setSessionMeta(prev => ({
              ...prev,
              createdAt: null,
              updatedAt: null,
              comments: [],
              tags: [],
            }))
            setSourceUrl("")
            setLastSavedAt(null)
            notificationService.success("Brouillon supprime")
            router.push("/learning/workspace")
          } finally {
            setLoading(false)
          }
        })()
      },
    })
  }, [confirm, draftId, router, setLoading])

  const lessonName = lessonDetail?.name || sessionMeta.title || "Dictee"
  const lessonMeta = selectedLessonId
    ? audioLessons.find((lesson) => lesson.id === selectedLessonId)
    : null
  const topBarDuration =
    lessonDetail?.durationSeconds != null
      ? formatDuration(lessonDetail.durationSeconds)
      : lessonMeta?.durationSeconds != null
        ? formatDuration(lessonMeta.durationSeconds)
        : "Aucun audio ouvert"
  const transcriptLength = sessionDraft.transcript.trim().length
  const notesCount = sessionDraft.notes.length
  const statusLabel = isSavingDraft
    ? "Sauvegarde auto"
    : lastSavedAt
      ? "Sauvegarde locale"
      : "Brouillon"

  return (
    <SessionTabProvider
      session={session}
      sessionDraft={sessionDraft}
      setSessionDraft={setSessionDraft}
      entryVocabCards={sessionVocabCards}
      updateSession={updateSession}
      addVocabCard={addVocabCard}
    >
      <div className="min-h-[calc(100vh-4rem)] -mt-16 bg-slate-50 text-sm md:min-h-screen md:mt-0 md:text-base">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col md:min-h-screen md:flex-row">
          {!isFocusMode && (
            <aside className="w-full border-b border-slate-200 bg-[#f8fbfd] p-4 md:w-[340px] md:border-b-0 md:border-r md:p-5">
              <div className="flex h-full flex-col gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-fit rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Retour a l'espace d'entrainement
                </Button>

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <div className="relative border-b border-slate-200 bg-emerald-50/70 p-5">
                    <div className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white">
                      <BookOpenText className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Infos session
                    </p>
                    <input
                      value={sessionMeta.title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      className="mt-3 w-full bg-transparent pr-20 text-2xl font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Nom de la dictee"
                      aria-label="Nom de la lecon"
                    />
                    <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-600">
                      Travaillez l'ecoute avec un audio authentique et gardez brouillon, notes et vocabulaire dans un seul espace.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800">
                        {lang.toUpperCase()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700"
                      >
                        {transcriptLength} caracteres
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700"
                      >
                        {notesCount} notes
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <SourceSelector
                      mode={sourceMode}
                      sourceUrl={sourceUrl}
                      onModeChange={handleSourceModeChange}
                      onSourceUrlChange={handleSourceUrlChange}
                      audioLessons={audioLessons}
                      audioLessonsLoading={audioLessonsLoading}
                      audioLessonsError={audioLessonsError}
                      selectedLessonId={selectedLessonId}
                      onSelectLesson={handleSelectLesson}
                      onOpenLesson={handleOpenSelectedLesson}
                      isOpeningLesson={false}
                      compact
                    />

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Library className="h-4 w-4 text-emerald-500" />
                          <p className="text-sm font-semibold text-slate-900">Outils de travail</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {statusLabel}
                        </Badge>
                      </div>
                      <SidebarTabs
                        isDimmed={false}
                        flexBasis="100%"
                        compact
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl border border-emerald-200 bg-emerald-400 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(52,211,153,0.16)] hover:bg-emerald-400/90"
                    onClick={handleSaveTranscript}
                    disabled={isSavingToCloud}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSavingToCloud ? "Sauvegarde..." : "Enregistrer la transcription"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl border border-rose-100 bg-rose-50/80 text-sm font-medium text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                    onClick={handleDiscardDraft}
                  >
                    Supprimer le brouillon
                  </Button>
                </div>
              </div>
            </aside>
          )}

          <section className="flex min-w-0 flex-1 flex-col p-3 md:p-5">
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Session d'ecoute
                    </p>
                    <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">
                      {lessonName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      {topBarDuration}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs font-medium">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                      {statusLabel}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      onClick={handleToggleAudioWindow}
                    >
                      <Headphones className="mr-2 h-4 w-4" />
                      {lessonDetail ? (showLessonWindow ? "Masquer l'audio" : "Afficher l'audio") : "Ouvrir l'audio"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={handleToggleFocusMode}
                    >
                      <Focus className="mr-2 h-4 w-4" />
                      {isFocusMode ? "Quitter le mode focus" : "Mode focus"}
                    </Button>
                  </div>
                </div>
              </div>

              {lessonDetail && showLessonWindow && (
                <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-4 md:px-5">
                  <AudioLessonPreviewWindow
                    lesson={lessonDetail}
                    onClose={() => setShowLessonWindow(false)}
                  />
                </div>
              )}

              <div className="p-3 md:p-5">
                <div className="flex flex-col gap-4">
                  <div
                    className="min-w-0"
                    style={{ flexBasis: "100%" }}
                  >
                    <DictationPanel
                      editorKey={session.id}
                      value={sessionDraft.transcript}
                      onChange={handleTranscriptChange}
                      editorRef={editorRef}
                      isFocusMode={isFocusMode}
                      isAudioWindowOpen={showLessonWindow}
                      lessonDetail={lessonDetail}
                      selectedLessonId={selectedLessonId}
                      audioLessons={audioLessons}
                      audioLessonsLoading={audioLessonsLoading}
                      audioLessonsError={audioLessonsError}
                      hasAudioOptions={audioLessons.length > 0}
                      onSelectLesson={handleSelectLesson}
                      onToggleFocusMode={handleToggleFocusMode}
                      onToggleAudioWindow={handleToggleAudioWindow}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* AI Assistant is globally mounted in learning layout */}

        {dialog}
      </div>
    </SessionTabProvider>
  )
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
