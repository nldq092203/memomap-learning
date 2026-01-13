import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AudioLessonListItem } from "@/lib/services/learning-api"
import { Loader2, List, Type } from "lucide-react"

export type WorkspaceSourceMode = "dictation" | "numbers_in_speech"

interface SourceSelectorProps {
  mode: WorkspaceSourceMode
  sourceUrl: string
  onModeChange: (mode: WorkspaceSourceMode) => void
  onSourceUrlChange: (value: string) => void
  audioLessons: AudioLessonListItem[]
  audioLessonsLoading: boolean
  audioLessonsError: string | null
  selectedLessonId: string
  onSelectLesson: (id: string) => void
  onOpenLesson: () => void
  isOpeningLesson: boolean
}

/**
 * SourceSelector renders the activity + source controls for training:
 * - Activity mode (Dictation vs Numbers in Speech)
 * - For Dictation: URL input or saved audio picker
 * - For Numbers in Speech: a light hint for now (logic will be added later)
 */
export const SourceSelector = memo(function SourceSelector({
  mode,
  sourceUrl,
  onModeChange,
  onSourceUrlChange,
  audioLessons,
  audioLessonsLoading,
  audioLessonsError,
  selectedLessonId,
  onSelectLesson,
  onOpenLesson,
  isOpeningLesson,
}: SourceSelectorProps) {
  const [dictationSource, setDictationSource] = useState<"url" | "audio_library">("url")
  const hasAudioLessons = audioLessons.length > 0

  const handleDictationSourceChange = (next: "url" | "audio_library") => {
    setDictationSource(next)

    // When switching to saved audio, clear any stale URL so we don't
    // accidentally save it as the session's source.
    if (next === "audio_library" && sourceUrl) {
      onSourceUrlChange("")
    }
  }

  return (
    <div className="py-2 border-b border-muted/50 px-3 md:px-6 space-y-2">

      {/* Dictation source controls (current behavior) */}
      {mode === "dictation" && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <span className="font-medium text-muted-foreground">Source</span>
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={dictationSource === "url" ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => handleDictationSourceChange("url")}
              >
                URL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dictationSource === "audio_library" ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => handleDictationSourceChange("audio_library")}
                disabled={audioLessonsLoading && !hasAudioLessons}
                title={
                  hasAudioLessons
                    ? "Choose from your saved audio lessons"
                    : "Saved audio lessons are loading or not available yet"
                }
              >
                Available audio
              </Button>
            </div>
          </div>
          {dictationSource === "url" && (
            <Input
              value={sourceUrl}
              onChange={(e) => onSourceUrlChange(e.target.value)}
              placeholder="https://example.com - Source URL for dictation"
              className="h-8 text-sm"
              aria-label="Source URL"
            />
          )}

          {dictationSource === "audio_library" && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedLessonId || ""}
                  onValueChange={onSelectLesson}
                  disabled={audioLessonsLoading || !hasAudioLessons}
                >
                  <SelectTrigger className="h-8 w-56 text-xs md:text-sm">
                    <SelectValue
                      placeholder={
                        audioLessonsLoading
                          ? "Loading audio lessons..."
                          : "Choose an audio lesson"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {audioLessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.name || `Lesson ${lesson.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onOpenLesson}
                  disabled={!selectedLessonId || isOpeningLesson}
                >
                  {isOpeningLesson && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  {selectedLessonId ? "Open" : "Open audio"}
                </Button>
              </div>

              {audioLessonsError && (
                <p className="text-[11px] text-destructive">
                  {audioLessonsError}
                </p>
              )}

              {!audioLessonsLoading && !audioLessonsError && !hasAudioLessons && (
                <p className="text-[11px] text-muted-foreground">
                  No saved audio lessons found. Use the Transcribe workspace to
                  create one, then they&apos;ll appear here.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Numbers in Speech placeholder */}
      {mode === "numbers_in_speech" && (
        <div className="mt-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[11px] md:text-xs text-amber-900">
          <p className="font-medium mb-0.5">Numbers in Speech (coming soon)</p>
          <p>
            Paste or record a short transcript here and we&apos;ll highlight and quiz you on the
            numbers mentioned in the audio. The detection and quiz logic will be wired up next.
          </p>
        </div>
      )}
    </div>
  )
})
