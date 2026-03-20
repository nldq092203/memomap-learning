import { memo, type RefObject } from "react"
import { ShortcutPanel } from "@/components/ui/shortcut-panel"
import {
  TranscriptEditor,
  type TranscriptEditorHandle,
} from "@/components/learning/editor/transcript-editor"
import { Button } from "@/components/ui/button"
import type { AudioLessonListItem } from "@/lib/services/learning-api"
import { Focus, Headphones } from "lucide-react"
import { cn } from "@/lib/utils"

interface DictationPanelProps {
  value: string
  onChange: (value: string) => void
  editorRef: RefObject<TranscriptEditorHandle | null>
  isFocusMode: boolean
  isAudioWindowOpen: boolean
  onToggleFocusMode: () => void
  lessonDetail: unknown | null
  selectedLessonId: string
  audioLessons: AudioLessonListItem[]
  audioLessonsLoading: boolean
  audioLessonsError: string | null
  hasAudioOptions: boolean
  onSelectLesson: (lessonId: string) => void
  onToggleAudioWindow: () => void
  editorKey?: string
}

/**
 * DictationPanel renders the central paper-like writing experience
 * with the TranscriptEditor and a floating helper toolbar (hint, focus, audio).
 */
export const DictationPanel = memo(function DictationPanel({
  value,
  onChange,
  editorRef,
  isFocusMode,
  isAudioWindowOpen,
  onToggleFocusMode,
  lessonDetail,
  selectedLessonId,
  audioLessons,
  audioLessonsLoading,
  audioLessonsError,
  hasAudioOptions,
  onSelectLesson,
  onToggleAudioWindow,
  editorKey,
}: DictationPanelProps) {
  return (
    <>
      <div
        className={cn(
          "relative flex h-full justify-center overflow-auto rounded-[28px] border border-slate-200 bg-slate-50 p-3 md:p-5 transition-colors",
          isFocusMode && "bg-slate-100"
        )}
      >
        <div
          className={cn(
            "w-full min-h-[72vh] rounded-[28px] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-all md:px-10 md:py-10",
            isFocusMode ? "max-w-5xl" : "max-w-4xl"
          )}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Transcription
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tapez ce que vous entendez. La mise en page reste nette pendant l&apos;ecriture.
              </p>
            </div>
            <div className="hidden md:block">
              <ShortcutPanel />
            </div>
          </div>
          <TranscriptEditor
            key={editorKey ?? "session-editor"}
            ref={editorRef}
            value={value}
            onChange={onChange}
            className="min-h-[320px] flex-1 bg-transparent p-0 text-[16px] leading-10 tracking-[0.02em] text-slate-700 md:text-[18px]"
          />
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex flex-col gap-3 rounded-[1.25rem] border border-black/[0.04] bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:w-auto md:bottom-8 md:right-8">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 w-full gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition-transform active:scale-95 sm:h-9 sm:w-auto"
          onClick={onToggleFocusMode}
        >
          <Focus className="h-4 w-4" />
          Concentration
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={cn(
            "h-10 w-full gap-1.5 rounded-xl px-4 text-xs font-medium text-emerald-600 shadow-sm transition-transform active:scale-95 sm:h-9 sm:w-auto",
            lessonDetail
              ? "border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              : "border border-dashed border-emerald-200 bg-white"
          )}
          onClick={onToggleAudioWindow}
        >
          <Headphones className="h-4 w-4" />
          {lessonDetail ? "Audio" : "Ouvrir l'audio"}
        </Button>
      </div>
    </>
  )
})
