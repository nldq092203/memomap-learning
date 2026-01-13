"use client"

import { useState } from "react"
import {
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WhisperChunk } from "@/components/learning/transcribe/transcribe-types"
import { formatDashStyleConversation } from "@/lib/hooks/use-transcription"

type TranscriptSectionProps = {
  transcript: string
  chunks: WhisperChunk[]
  streamingChunks: WhisperChunk[]
  isTranscribing: boolean
  copied: boolean
  onCopy: () => void
  transcriptRef: React.RefObject<HTMLPreElement>
}

export function TranscribeTranscriptSection({
  transcript,
  chunks,
  streamingChunks,
  isTranscribing,
  copied,
  onCopy,
  transcriptRef,
}: TranscriptSectionProps) {
  const [showTimestamps, setShowTimestamps] = useState(false)

  const handleDownload = () => {
    if (!transcript) return

    const blob = new Blob([transcript], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transcript-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const liveChunks = isTranscribing ? streamingChunks : chunks

  const formattedTurns =
    transcript.trim().length > 0
      ? formatDashStyleConversation(transcript)
      : []

  // Don't render if nothing to show
  if (!transcript && !isTranscribing && liveChunks.length === 0) {
    return null
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Results</h3>
        {transcript && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="h-8 gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <pre
          ref={transcriptRef}
          className="min-h-[200px] max-h-[500px] overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed"
          aria-label="Transcription result"
        >
          {isTranscribing && !transcript ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing audio… Results will appear as chunks are processed.
            </span>
          ) : (
            <>
              {formattedTurns.length > 0
                ? formattedTurns.map((turn, index) => (
                    <div key={index}>- {turn}</div>
                  ))
                : transcript}
            </>
          )}
        </pre>

        {liveChunks.length > 0 && (
          <div className="border-t">
            <button
              type="button"
              onClick={() => setShowTimestamps(!showTimestamps)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Timestamps ({liveChunks.length} segments)
              </span>
              {showTimestamps ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showTimestamps && (
              <div className="max-h-80 space-y-0.5 overflow-y-auto border-t bg-muted/20 p-3">
                {liveChunks.map((chunk, index) => {
                  const [start, end] = chunk.timestamp ?? [null, null]
                  const formatTime = (t: number | null) =>
                    typeof t === "number"
                      ? `${Math.floor(t / 60)
                          .toString()
                          .padStart(2, "0")}:${Math.floor(t % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "--:--"

                  return (
                    <div
                      key={`${index}-${start ?? 0}-${end ?? 0}`}
                      className="group flex gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-background"
                    >
                      <span className="shrink-0 font-mono text-[0.7rem] text-primary">
                        {formatTime(start)} → {formatTime(end)}
                      </span>
                      <span className="break-words leading-relaxed">
                        {chunk.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
