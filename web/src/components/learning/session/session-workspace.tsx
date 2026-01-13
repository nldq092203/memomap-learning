"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
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
import { WorkspaceHeader } from "@/components/learning/workspace/workspace-header"
import {
  SourceSelector,
  type WorkspaceSourceMode,
} from "@/components/learning/workspace/source-selector"
import { DictationPanel } from "@/components/learning/workspace/dictation-panel"
import { SidebarTabs } from "@/components/learning/workspace/sidebar-tabs"
import { ResizeHandle } from "@/components/learning/workspace/resize-handle"
import type { TranscriptEditorHandle } from "@/components/learning/editor/transcript-editor"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import {
  deleteTranscriptDraft,
  loadTranscriptDraft,
  saveTranscriptDraft,
} from "@/lib/db/transcript-drafts"
import type { LearningSession, LocalVocabCard } from "@/lib/types/learning-session"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"

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
    title: "Dictation practice",
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
  const [splitRatio, setSplitRatio] = useState(0.65)
  const [isResizing, setIsResizing] = useState(false)
  const [sourceMode, setSourceMode] = useState<WorkspaceSourceMode>("dictation")
  const [audioLessons, setAudioLessons] = useState<AudioLessonListItem[]>([])
  const [audioLessonsLoading, setAudioLessonsLoading] = useState(false)
  const [audioLessonsError, setAudioLessonsError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [lessonDetail, setLessonDetail] = useState<AudioLessonDetail | null>(null)
  const [showLessonWindow, setShowLessonWindow] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  const editorRef = useRef<TranscriptEditorHandle | null>(null)
  const layoutRef = useRef<HTMLDivElement | null>(null)

  // Hydrate draft from IndexedDB for current language
  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const existing = await loadTranscriptDraft(draftId)
      if (cancelled) return

      if (existing) {
        setSessionMeta({
          id: existing.id,
          title: existing.title || "Dictation practice",
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
          title: "Dictation practice",
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
          title: sessionMeta.title || "Dictation practice",
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

  // Handle drag-to-resize between editor and sidebar (desktop only)
  const handleResizeMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      const container = layoutRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const relativeX = event.clientX - rect.left
      if (relativeX <= 0 || relativeX >= rect.width) return

      // Clamp ratio so both panes stay readable
      const minRatio = 0.4 // left min 40%
      const maxRatio = 0.8 // left max 80%
      const ratio = Math.min(Math.max(relativeX / rect.width, minRatio), maxRatio)
      setSplitRatio(ratio)
    }

    const stopResizing = () => {
      setIsResizing(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", stopResizing)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [isResizing])

  // Load saved audio lessons when switching to audio-backed modes
  useEffect(() => {
    // Audio-backed flows will be reintroduced later; keep loader ready.
    if (!lang) {
      return
    }

    let isCancelled = false
    const loadLessons = async () => {
      setAudioLessonsLoading(true)
      setAudioLessonsError(null)
      try {
        const response = await learningApi.getAudioLessons(
          lang as LearningLanguage,
          50,
        )
        if (!isCancelled) {
          setAudioLessons(response.lessons ?? [])
        }
      } catch (error) {
        console.error("Failed to load audio lessons", error)
        if (!isCancelled) {
          setAudioLessonsError("Failed to load saved audio lessons")
        }
      } finally {
        if (!isCancelled) {
          setAudioLessonsLoading(false)
        }
      }
    }

    void loadLessons()

    return () => {
      isCancelled = true
    }
  }, [lang])

  const handleOpenSelectedLesson = useCallback(() => {
    console.log("[Workspace] Open selected lesson clicked", {
      selectedLessonId,
      audioLessonsCount: audioLessons.length,
    })

    if (!selectedLessonId) {
      notificationService.info("Please choose a saved audio lesson first")
      return
    }

    const meta = audioLessons.find((lesson) => lesson.id === selectedLessonId)
    if (!meta) {
      notificationService.error("Selected audio lesson metadata not found")
      return
    }

    // Seed lesson detail with lightweight metadata; transcript will be
    // fetched lazily inside the preview window when requested.
    setLessonDetail({
      id: meta.id,
      name: meta.name,
      language: meta.language ?? null,
      durationSeconds: meta.durationSeconds ?? null,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      transcript: undefined,
      timestamps: undefined,
      audioFileName: undefined,
      audioFileSizeBytes: undefined,
    })
    setShowLessonWindow(true)
  }, [selectedLessonId, audioLessons])

  const handleBack = useCallback(() => {
    router.push("/learning")
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

  const editorBasis = isFocusMode
    ? "100%"
    : `${Math.round(splitRatio * 100)}%`
  const sidebarBasis = isFocusMode ? "0%" : `${Math.round((1 - splitRatio) * 100)}%`

  const session: LearningSession = useMemo(
    () => ({
      id: sessionMeta.id || draftId,
      language: lang,
      title: sessionMeta.title || "Dictation practice",
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
      notificationService.info("Nothing to save yet. Type some text first.")
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
      notificationService.success("Transcript saved to cloud ✨")

      // Mark local draft as "saved" for short-term recovery (1 day TTL)
      await saveTranscriptDraft({
        id: sessionMeta.id || draftId,
        language: lang as LearningLanguage,
        title: sessionMeta.title || "Dictation practice",
        sourceUrl: sourceUrl || null,
        transcript: transcriptText,
        notes: sessionDraft.notes,
        comments: sessionMeta.comments,
        tags: sessionMeta.tags,
        status: "saved",
      })
      router.push("/learning")
    } catch (error) {
      console.error("Failed to save transcript", error)
      notificationService.error("Failed to save transcript. Please try again.")
    } finally {
      setIsSavingToCloud(false)
      setLoading(false)
    }
  }, [draftId, lang, sessionDraft, sessionMeta, sourceUrl, router, setLoading])

  const handleDiscardDraft = useCallback(() => {
    confirm({
      title: "Delete draft?",
      description:
        "This will delete your current dictation draft from this device. It will not affect any transcripts already saved to the cloud.",
      confirmText: "Delete draft",
      cancelText: "Cancel",
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
            notificationService.success("Draft deleted")
            router.push("/learning")
          } finally {
            setLoading(false)
          }
        })()
      },
    })
  }, [confirm, draftId, router, setLoading])

  return (
    <SessionTabProvider
      session={session}
      sessionDraft={sessionDraft}
      setSessionDraft={setSessionDraft}
      entryVocabCards={sessionVocabCards}
      updateSession={updateSession}
      addVocabCard={addVocabCard}
    >
      <div className="h-[calc(100vh-56px)] flex flex-col text-sm md:text-base">
        {/* Header */}
        <WorkspaceHeader
          languageCode={lang}
          lessonTitle={sessionMeta.title}
          isSavingEntry={isSavingDraft}
          lastSavedAt={lastSavedAt}
          onBack={handleBack}
          onTitleChange={handleTitleChange}
          onSave={handleSaveTranscript}
          onDiscardDraft={handleDiscardDraft}
          isSavingToCloud={isSavingToCloud}
        />

        {/* Source selector: URL or saved transcription */}
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
        />

        {/* Content */}
        <div className="flex-1 p-3 md:p-6">
          <div
            ref={layoutRef}
            className="flex flex-col md:flex-row gap-3 md:gap-6 h-full"
          >
            <div
              className="h-[calc(100vh-56px-72px-32px)] md:h-[calc(100vh-56px-64px-48px)] md:min-w-0"
              style={{ flexBasis: editorBasis }}
            >
              <DictationPanel
                editorKey={session.id}
                value={sessionDraft.transcript}
                onChange={handleTranscriptChange}
                editorRef={editorRef}
                isFocusMode={isFocusMode}
                isAudioWindowOpen={showLessonWindow}
                lessonDetail={lessonDetail}
                onToggleFocusMode={handleToggleFocusMode}
                onToggleAudioWindow={handleToggleAudioWindow}
              />
            </div>

            {!isFocusMode && (
              <ResizeHandle
                isResizing={isResizing}
                onMouseDown={handleResizeMouseDown}
              />
            )}

            <SidebarTabs
              isDimmed={isFocusMode}
              flexBasis={sidebarBasis}
            />
          </div>
        </div>

        {/* AI Assistant is globally mounted in learning layout */}

        {lessonDetail && showLessonWindow && (
          <AudioLessonPreviewWindow
            lesson={lessonDetail}
            onClose={() => setShowLessonWindow(false)}
          />
        )}

        {dialog}
      </div>
    </SessionTabProvider>
  )
}
