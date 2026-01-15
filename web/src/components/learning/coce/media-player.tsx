"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2, Sparkles } from "lucide-react"
import type { CoCeExercise } from "@/lib/types/api/coce"

interface MediaPlayerProps {
  exercise: CoCeExercise
  showTranscript: boolean
  onTranscriptToggle: () => void
  isLoadingTranscript: boolean
}

export function MediaPlayer({
  exercise,
  showTranscript,
  onTranscriptToggle,
  isLoadingTranscript,
}: MediaPlayerProps) {
  const isVideo = exercise.media_type === 'video'
  const isAudio = exercise.media_type === 'audio'

  return (
    <Card className="overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <div className="relative">
        {/* Video Player */}
        {isVideo && exercise.video_url && (
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            <iframe
              src={exercise.video_url}
              title={exercise.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )}

        {/* Audio Player */}
        {isAudio && exercise.audio_url && (
          <div className="flex items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 md:p-12">
            <div className="w-full max-w-2xl space-y-6">
              {/* Audio Visualization Area */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-1 rounded-full bg-primary/30 animate-pulse"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1.5s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Audio Player Controls */}
              <audio
                controls
                src={exercise.audio_url}
                className="w-full"
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {/* Fallback for missing media */}
        {!exercise.video_url && !exercise.audio_url && (
          <div className="flex items-center justify-center bg-muted p-16">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Media not available</p>
              <p className="text-xs mt-1">Media type: {exercise.media_type}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between border-t bg-card/95 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              {isVideo ? "🎥" : "🎧"}
            </div>
            <span className="font-medium">
              {isVideo ? "Video" : "Audio"} Exercise
            </span>
          </div>
        </div>

        <Button
          variant={showTranscript ? "default" : "outline"}
          size="sm"
          onClick={onTranscriptToggle}
          disabled={isLoadingTranscript}
          className="gap-2"
        >
          {isLoadingTranscript && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <FileText className="h-4 w-4" />
          {showTranscript ? "Hide" : "Show"} Transcript
        </Button>
      </div>
    </Card>
  )
}
