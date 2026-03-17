"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, FileAudio, CheckCircle2, HardDriveDownload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/utils/audio-processing"
import { cn } from "@/lib/utils"

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
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">
          1. Importez votre audio
        </h2>
        <p className="text-xs text-slate-500">
          Glissez votre fichier ici ou cliquez pour le choisir.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Importer un fichier audio"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging
            ? "scale-[1.01] border-teal-400 bg-teal-50"
            : "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_35%,#eef7f6_100%)] hover:border-teal-300"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#99f6e4_0%,#d1fae5_50%,#5eead4_100%)] opacity-90" />
        <div className="pointer-events-none absolute right-6 top-6 opacity-15">
          <div className="flex items-end gap-1">
            {[22, 36, 28, 44, 32, 54, 26, 40, 24].map((height, index) => (
              <span
                key={index}
                className={cn(
                  "w-1.5 rounded-full",
                  index % 3 === 0
                    ? "bg-emerald-300"
                    : index % 3 === 1
                      ? "border border-slate-200 bg-white"
                      : "bg-teal-300"
                )}
                style={{ height }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "rounded-full p-3 transition-colors",
              isDragging
                ? "bg-teal-100 text-teal-700"
                : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
            )}
          >
            <Upload className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-medium">
              {isDragging
                ? "Déposez votre audio ici"
                : "Glissez votre audio ici, ou cliquez pour le choisir"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              MP3, WAV, M4A, WEBM • 100% privé dans votre navigateur
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 inline-flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <div className="rounded-md bg-teal-100 p-2">
              <FileAudio className="h-4 w-4 text-teal-700" />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="max-w-[200px] truncate text-sm font-medium">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            <Badge variant="default" className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <CheckCircle2 className="h-3 w-3" />
              Prêt
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

      {selectedFile && audioUrl && (
        <div className="animate-in slide-in-from-top-2 rounded-[24px] border border-slate-200 bg-white p-4 duration-300">
          <p className="mb-3 text-xs font-medium text-slate-500">
            Aperçu audio
          </p>
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full"
            preload="metadata"
          >
            {"Votre navigateur ne prend pas en charge l'audio HTML5."}
          </audio>
        </div>
      )}

      <div className="rounded-[20px] border border-sky-200 bg-sky-50/80 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
            <HardDriveDownload className="h-4.5 w-4.5 text-sky-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-sky-800">
              {"Premier usage : le modèle IA se télécharge dans votre navigateur."}
            </p>
            <p className="mt-1 text-xs leading-5 text-sky-700/80">
              La première transcription peut être un peu plus lente.
            </p>
          </div>
        </div>
      </div>

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
