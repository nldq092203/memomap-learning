import { memo, type RefObject } from "react"
import { ShortcutPanel } from "@/components/ui/shortcut-panel"
import {
  TranscriptEditor,
  type TranscriptEditorHandle,
} from "@/components/learning/editor/transcript-editor"
import { Button } from "@/components/ui/button"
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
  onToggleAudioWindow,
  editorKey,
}: DictationPanelProps) {
  const hasAudioLesson = !!lessonDetail

  return (
    <>
      {/* Desk-like background with centered paper sheet */}
      <div
        className={cn(
          "relative h-full flex justify-center overflow-auto px-4 md:px-8 py-6 transition-colors",
          isFocusMode ? "bg-[#f2f2f2]" : "bg-[#fafafa]"
        )}
      >
        <div
          className={cn(
            "w-full min-h-[80vh] bg-white rounded-2xl border border-neutral-200 shadow-[0_2px_10px_rgba(0,0,0,0.06)] px-6 md:px-10 py-8 transition-all",
            isFocusMode ? "max-w-4xl" : "max-w-3xl"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
              Dictation / Input
            </p>
            <ShortcutPanel />
          </div>
          <TranscriptEditor
            key={editorKey ?? "session-editor"}
            ref={editorRef}
            value={value}
            onChange={onChange}
            className="min-h-[220px] flex-1 bg-transparent p-0 text-[15px] md:text-[16px] leading-relaxed tracking-[0.2px]"
          />
        </div>
      </div>

      {/* Floating toolbar – always visible, independent of scroll */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 bg-white/90 backdrop-blur shadow-lg border border-neutral-200 rounded-xl px-3 py-3 z-50">
        <Button
          type="button"
          size="sm"
          variant={isFocusMode ? "default" : "outline"}
          className="h-8 gap-1 rounded-full px-3 text-xs shadow-sm"
          onClick={onToggleFocusMode}
        >
          <Focus className="h-3.5 w-3.5" />
          Focus
        </Button>
        <Button
          type="button"
          size="sm"
          variant={
            hasAudioLesson
              ? isAudioWindowOpen
                ? "default"
                : "outline"
              : "ghost"
          }
          className="h-8 gap-1 rounded-full px-3 text-xs shadow-sm"
          disabled={!hasAudioLesson}
          onClick={onToggleAudioWindow}
        >
          <Headphones className="h-3.5 w-3.5" />
          Audio
        </Button>
      </div>
    </>
  )
})
