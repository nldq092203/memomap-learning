"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, FileAudio, CheckCircle2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/utils/audio-processing"

type UploadSectionProps = {
  selectedFile: File | null
  isDragging: boolean
  onDrop: React.DragEventHandler<HTMLDivElement>
  onDragOver: React.DragEventHandler<HTMLDivElement>
  onDragLeave: React.DragEventHandler<HTMLDivElement>
  onClick: () => void
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>
  onInputChange: React.ChangeEventHandler<HTMLInputElement>
  inputRef: React.RefObject<HTMLInputElement>
}

export function TranscribeUploadSection({
  selectedFile,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  onKeyDown,
  onInputChange,
  inputRef,
}: UploadSectionProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create and cleanup audio URL
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setAudioUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setAudioUrl(null)
      }
    } else {
      setAudioUrl(null)
    }
  }, [selectedFile])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (inputRef.current) {
      inputRef.current.value = ""
    }
    // Trigger change event with no file
    const event = new Event("change", { bubbles: true })
    inputRef.current?.dispatchEvent(event)
  }

  return (
    <section className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload audio file for transcription"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "group relative cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all",
          "hover:border-primary/50 hover:bg-primary/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border bg-muted/20",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={[
              "rounded-full p-3 transition-colors",
              isDragging
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
            ].join(" ")}
          >
            <Upload className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-medium">
              {isDragging
                ? "Drop your audio file here"
                : "Drag and drop audio, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              MP3, WAV, M4A, WEBM • Processed locally in your browser
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 inline-flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm">
            <div className="rounded-md bg-primary/10 p-2">
              <FileAudio className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="max-w-[200px] truncate text-sm font-medium">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            <Badge variant="default" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-7 w-7 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Audio Preview Player */}
      {selectedFile && audioUrl && (
        <div className="animate-in slide-in-from-top-2 rounded-lg border bg-card p-4 duration-300">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Audio Preview
          </p>
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
        onChange={onInputChange}
        className="hidden"
      />
    </section>
  )
}
