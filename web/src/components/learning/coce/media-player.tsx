"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Minimize2,
  MonitorPlay,
  Video,
  Volume2,
} from "lucide-react"
import type { CoCeExercise } from "@/lib/types/api/coce"

interface MediaPlayerProps {
  exercise: CoCeExercise
  showTranscript: boolean
  onTranscriptToggle: () => void
  isLoadingTranscript: boolean
  isCollapsed?: boolean
  onCollapseToggle?: () => void
}

export function MediaPlayer({
  exercise,
  showTranscript,
  onTranscriptToggle,
  isLoadingTranscript,
  isCollapsed = false,
  onCollapseToggle,
}: MediaPlayerProps) {
  const isVideo = exercise.media_type === "video"
  const isAudio = exercise.media_type === "audio"

  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Support
          </p>
          <h2 className="text-lg font-semibold text-slate-950">
            {isVideo ? "Vidéo d'examen" : "Audio d'examen"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
            {isVideo ? "Vidéo" : "Audio"}
          </Badge>
          {onCollapseToggle && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCollapseToggle}
              className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label={isCollapsed ? "Ouvrir le panneau média" : "Réduire le panneau média"}
            >
              {isCollapsed ? <MonitorPlay className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
        {isVideo && exercise.video_url && (
          <div className="relative aspect-video w-full">
            <iframe
              src={exercise.video_url}
              title={exercise.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )}

        {isAudio && exercise.audio_url && (
          <div className="space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/75">
                <Volume2 className="h-4 w-4 text-teal-300" />
                Lecture interactive
              </div>
              <div className="flex items-center gap-1 text-xs text-white/55">
                <ChevronLeft className="h-3.5 w-3.5" />
                5 s
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-12 items-end gap-1.5">
              {[28, 46, 36, 54, 40, 62, 30, 52, 38, 58, 42, 66].map((height, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-full",
                    index % 4 === 0 ? "bg-teal-300" : "bg-white/55"
                  )}
                  style={{ height }}
                />
              ))}
            </div>

            <audio controls src={exercise.audio_url} preload="metadata" className="w-full">
              Votre navigateur ne prend pas en charge l'audio HTML5.
            </audio>
          </div>
        )}

        {!exercise.video_url && !exercise.audio_url && (
          <div className="flex min-h-[180px] items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-500">
            Support indisponible pour cet exercice.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={showTranscript ? "default" : "outline"}
          size="sm"
          onClick={onTranscriptToggle}
          disabled={isLoadingTranscript}
          className={cn(
            "rounded-full px-4",
            showTranscript
              ? "bg-teal-500 text-white hover:bg-teal-500/90"
              : "border-slate-200 text-slate-700 hover:bg-slate-100"
          )}
        >
          {isLoadingTranscript ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {showTranscript ? "Masquer la transcription" : "Afficher la transcription"}
        </Button>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          {isVideo ? <Video className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          Réécoute libre pendant l'exercice
        </div>
      </div>
    </div>
  )
}
