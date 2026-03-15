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
import { Loader2, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
  compact?: boolean
}

/**
 * SourceSelector renders the audio source controls for the workspace.
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
  compact = false,
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
    <div
      className={cn(
        "w-full overflow-hidden",
        compact
          ? "rounded-[24px] border border-slate-200 bg-white p-4"
          : "border-b border-black/[0.04] bg-white px-4 py-3 md:px-8"
      )}
    >
      <div className={cn("w-full", !compact && "mx-auto max-w-7xl")}>
        {mode === "dictation" && (
          <div className={cn("flex flex-col gap-3", !compact && "md:flex-row md:items-center md:gap-4")}>
            <div className={cn("flex gap-3", compact ? "flex-col" : "items-center")}>
              <span className={cn(
                "text-xs font-semibold uppercase tracking-widest text-slate-400",
                compact ? "inline-block" : "hidden md:inline-block"
              )}>
                Source
              </span>
              <div className={cn("inline-flex rounded-xl bg-slate-100 p-1", compact && "w-full")}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-xs font-semibold transition-all shadow-none",
                    compact && "flex-1",
                    dictationSource === "url"
                      ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-white"
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                  )}
                  onClick={() => handleDictationSourceChange("url")}
                >
                  Lien URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-xs font-semibold transition-all shadow-none",
                    compact && "flex-1",
                    dictationSource === "audio_library"
                      ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-white"
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                  )}
                  onClick={() => handleDictationSourceChange("audio_library")}
                  disabled={audioLessonsLoading && !hasAudioLessons}
                  title={
                    hasAudioLessons
                      ? "Choisir parmi vos audios enregistres"
                      : "Les audios enregistres ne sont pas encore disponibles"
                  }
                >
                  Audio disponible
                </Button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {dictationSource === "url" && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    value={sourceUrl}
                    onChange={(e) => onSourceUrlChange(e.target.value)}
                    placeholder="https://exemple.com - Source de la dictee"
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border-slate-200 bg-white pl-8 text-sm focus-visible:ring-emerald-100/70",
                      compact ? "max-w-none" : "max-w-lg md:w-auto md:min-w-[320px]"
                    )}
                    aria-label="URL de la source"
                  />
                </div>
              )}

              {dictationSource === "audio_library" && (
                <div className={cn("flex gap-2", compact ? "flex-col" : "items-center")}>
                  <Select
                    value={selectedLessonId || ""}
                    onValueChange={onSelectLesson}
                    disabled={audioLessonsLoading || !hasAudioLessons}
                  >
                    <SelectTrigger className={cn(
                      "h-10 w-full rounded-xl border-slate-200 bg-white text-sm focus:ring-emerald-100/70",
                      !compact && "md:w-64"
                    )}>
                      <SelectValue
                        placeholder={
                          audioLessonsLoading
                            ? "Chargement des audios..."
                            : "Choisir un audio"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                      {audioLessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id} className="rounded-lg">
                          {lesson.name || `Audio ${lesson.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                      "h-10 rounded-xl bg-emerald-400 px-4 text-xs font-semibold text-white hover:bg-emerald-400/90",
                      compact && "w-full"
                    )}
                    onClick={onOpenLesson}
                    disabled={!selectedLessonId || isOpeningLesson}
                  >
                    {isOpeningLesson && (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    )}
                    {selectedLessonId ? "Ouvrir l'audio" : "Ouvrir"}
                  </Button>

                  {audioLessonsError && (
                    <span className={cn("text-xs font-medium text-destructive", !compact && "ml-2")}>
                      {audioLessonsError}
                    </span>
                  )}
                </div>
              )}
            </div>
            
             {dictationSource === "audio_library" && !audioLessonsLoading && !audioLessonsError && !hasAudioLessons && (
              <p className="text-[11px] text-muted-foreground">
                Aucun audio enregistre. Utilisez l'espace Transcrire.
              </p>
            )}
          </div>
        )}

        {mode === "numbers_in_speech" && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 mt-2">
            <p className="font-semibold mb-1">Nombres a l'oral (bientot)</p>
            <p className="opacity-90 leading-relaxed">
              Collez ou enregistrez un court texte ici et nous mettrons en avant les nombres mentionnes dans l'audio.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})
