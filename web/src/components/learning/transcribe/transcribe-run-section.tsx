"use client"

import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { isBrowser } from "@/lib/utils"

type RunSectionProps = {
  onTranscribeClick: () => void
  isModelLoading: boolean
  isTranscribing: boolean
  hasFile: boolean
  errorMessage: string | null
  modelProgress: number | null
  processedChunks?: number
  totalChunks?: number
}

export function TranscribeRunSection({
  onTranscribeClick,
  isModelLoading,
  isTranscribing,
  hasFile,
  errorMessage,
  modelProgress,
  processedChunks = 0,
  totalChunks = 0,
}: RunSectionProps) {
  const transcriptionProgress =
    totalChunks > 0 ? (processedChunks / totalChunks) * 100 : 0

  const isDisabled =
    isModelLoading || isTranscribing || !hasFile || !isBrowser()

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <Button
          type="button"
          onClick={onTranscribeClick}
          disabled={isDisabled}
          size="lg"
          className="w-full gap-2"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Transcribe Audio
            </>
          )}
        </Button>

        {/* Status Messages */}
        <div className="space-y-2">
          {isModelLoading && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-2 duration-300">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Downloading model...</span>
                {typeof modelProgress === "number" && (
                  <span className="font-medium">{modelProgress}%</span>
                )}
              </div>
              {typeof modelProgress === "number" && (
                <Progress value={modelProgress} className="h-1.5" />
              )}
            </div>
          )}

          {isTranscribing && !isModelLoading && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-2 duration-300">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Processing audio chunks...
                </span>
                {totalChunks > 0 && (
                  <span className="font-medium text-primary">
                    {processedChunks}/{totalChunks}
                  </span>
                )}
              </div>
              {totalChunks > 0 && (
                <div className="space-y-1">
                  <Progress value={transcriptionProgress} className="h-2" />
                  <p className="text-center text-[0.7rem] text-muted-foreground">
                    {Math.round(transcriptionProgress)}% complete
                  </p>
                </div>
              )}
            </div>
          )}

          {!isModelLoading && !isTranscribing && hasFile && !errorMessage && (
            <p className="text-center text-xs text-muted-foreground">
              Ready to transcribe your audio
            </p>
          )}

          {!hasFile && !errorMessage && (
            <p className="text-center text-xs text-muted-foreground">
              Upload an audio file to get started
            </p>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 duration-300">
            <p className="text-xs font-medium text-destructive">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

