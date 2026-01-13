"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FloatingWindow } from "@/components/ui/floating-windows"
import {
  learningApi,
  type AudioLessonDetail,
  type AudioLessonTimestampSegment,
} from "@/lib/services/learning-api"
import { Button } from "@/components/ui/button"
import { Loader2, ListCollapse, Volume2 } from "lucide-react"
import { authService } from "@/lib/services/auth"
import { notificationService } from "@/lib/services/notification-service"

interface AudioLessonPreviewWindowProps {
  lesson: AudioLessonDetail
  onClose: () => void
}

// In-memory cache so that each lesson's audio is fetched at most once.
// This is module-scoped and survives component unmounts, which also
// avoids duplicate network requests under React Strict Mode.
const audioUrlCache = new Map<string, string>()
const audioRequestCache = new Map<string, Promise<string>>()

function formatClockTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) {
    return "--:--"
  }
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) {
    return "Unknown"
  }
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}h ${m}m ${s}s`
  }
  if (m > 0) {
    return `${m}m ${s}s`
  }
  return `${s}s`
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) {
    return "Unknown size"
  }
  const mb = bytes / (1024 * 1024)
  if (mb < 1) {
    const kb = bytes / 1024
    return `${kb.toFixed(1)} KB`
  }
  return `${mb.toFixed(1)} MB`
}

export function AudioLessonPreviewWindow({
  lesson,
  onClose,
}: AudioLessonPreviewWindowProps) {
  const initialTitle =
    lesson.name ||
    lesson.audioFileName ||
    `Audio lesson ${lesson.id ?? ""}`.trim()

  const [detail, setDetail] = useState<AudioLessonDetail | null>(() => lesson)
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false)
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const audioEndpoint = useMemo(
    () => learningApi.getAudioLessonAudioUrl(lesson.id),
    [lesson.id]
  )

  const segments: AudioLessonTimestampSegment[] = Array.isArray(
    detail?.timestamps
  )
    ? (detail?.timestamps as AudioLessonTimestampSegment[])
    : []

  const transcriptText = (detail?.transcript || "").trim()
  const hasSegments = segments.length > 0

  const title = initialTitle

  useEffect(() => {
    let cancelled = false

    const loadAudio = async () => {
      const cacheKey = lesson.id
      const cachedUrl = audioUrlCache.get(cacheKey)
      if (cachedUrl) {
        setAudioUrl(cachedUrl)
        setIsAudioLoading(false)
        return
      }

      const inFlight = audioRequestCache.get(cacheKey)
      if (inFlight) {
        setIsAudioLoading(true)
        try {
          const url = await inFlight
          if (!cancelled) {
            setAudioUrl(url)
          }
        } catch (error) {
          console.error("Failed to load audio lesson audio (in-flight)", error)
          if (!cancelled) {
            setAudioError("Failed to load audio. Please try again.")
          }
        } finally {
          if (!cancelled) {
            setIsAudioLoading(false)
          }
        }
        return
      }

      setIsAudioLoading(true)
      setAudioError(null)

      const fetchPromise = (async () => {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("auth_token")
            : null

        const response = await fetch(audioEndpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          if (response.status === 401) {
            try {
              await authService.logout()
            } catch {
              // ignore logout errors
            }
            notificationService.error(
              "Your session has expired. Please log in again.",
            )
            if (typeof window !== "undefined") {
              setTimeout(() => {
                try {
                  const returnTo =
                    window.location.pathname + window.location.search
                  sessionStorage.setItem("auth_return_to", returnTo)
                } catch {
                  // ignore storage errors
                }
                window.location.href = "/"
              }, 1500)
            }
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        audioUrlCache.set(cacheKey, objectUrl)
        return objectUrl
      })()

      audioRequestCache.set(cacheKey, fetchPromise)

      try {
        const objectUrl = await fetchPromise
        audioRequestCache.delete(cacheKey)
        if (!cancelled) {
          setAudioUrl(objectUrl)
        }
      } catch (error) {
        console.error("Failed to load audio lesson audio", error)
        if (!cancelled) {
          setAudioError("Failed to load audio. Please try again.")
        }
      } finally {
        if (!cancelled) {
          setIsAudioLoading(false)
        }
        audioRequestCache.delete(cacheKey)
      }
    }

    void loadAudio()

    return () => {
      cancelled = true
    }
  }, [audioEndpoint, lesson.id])

  const handleToggleTranscript = useCallback(async () => {
    if (isTranscriptVisible && detail?.transcript) {
      setIsTranscriptVisible(false)
      return
    }

    if (detail?.transcript && Array.isArray(detail.timestamps)) {
      setIsTranscriptVisible(true)
      return
    }

    setIsTranscriptLoading(true)
    setTranscriptError(null)
    try {
      const full = await learningApi.getAudioLessonDetail(lesson.id)
      setDetail(full)
      setIsTranscriptVisible(true)
    } catch (error) {
      console.error("Failed to load audio lesson transcript", error)
      setTranscriptError("Failed to load transcription. Please try again.")
    } finally {
      setIsTranscriptLoading(false)
    }
  }, [detail, isTranscriptVisible, lesson.id])

  return (
    <FloatingWindow
      id={`audio-lesson-${lesson.id}`}
      title={title}
      persistKey="audio-lesson-preview"
      defaultWidth={520}
      defaultHeight={440}
      defaultX={32}
      defaultY={72}
      minWidth={380}
      minHeight={320}
      onClose={onClose}
    >
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {lesson.language && (
              <span>
                Language{" "}
                <span className="font-semibold text-foreground">
                  {lesson.language.toUpperCase()}
                </span>
              </span>
            )}
            {lesson.durationSeconds != null && (
              <span>Duration {formatDuration(lesson.durationSeconds)}</span>
            )}
            {lesson.audioFileSizeBytes != null && (
              <span>Size {formatBytes(lesson.audioFileSizeBytes)}</span>
            )}
          </div>
          {lesson.audioFileName && (
            <div className="text-[11px]">
              File{" "}
              <span className="font-mono text-foreground">
                {lesson.audioFileName}
              </span>
            </div>
          )}
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-xs">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          {isAudioLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading audio…
            </div>
          ) : audioError ? (
            <div className="text-xs text-destructive">{audioError}</div>
          ) : (
            <audio controls className="w-full" src={audioUrl ?? undefined}>
              Your browser does not support the audio element.
            </audio>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Use the audio player to drive your dictation. You can toggle
            the timestamped transcription below when needed.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleToggleTranscript}
            disabled={isTranscriptLoading}
            className="gap-1 text-xs"
          >
            {isTranscriptLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <ListCollapse className="h-3.5 w-3.5" />
                {isTranscriptVisible ? "Hide transcription" : "Show transcription"}
              </>
            )}
          </Button>
        </div>

        {isTranscriptVisible && (
          <div className="flex min-h-[200px] flex-col">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {hasSegments ? "Segments" : "Transcript"}
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {hasSegments
                  ? `${segments.length} segment${
                      segments.length === 1 ? "" : "s"
                    }`
                  : transcriptText
                    ? "Full transcript"
                    : transcriptError
                      ? "Failed to load transcription"
                      : "No transcription"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
              {hasSegments ? (
                <div className="space-y-1.5">
                  {segments.map((segment) => {
                    const key = `${segment.startSec}-${segment.endSec}-${segment.text.slice(
                      0,
                      12
                    )}`
                    return (
                      <div
                        key={key}
                        className="rounded-md bg-background px-2 py-1.5"
                      >
                        <div className="font-mono text-[0.7rem] text-emerald-600">
                          {formatClockTime(segment.startSec)} →{" "}
                          {formatClockTime(segment.endSec)}
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap break-words text-[0.72rem] leading-relaxed text-foreground">
                          {segment.text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : transcriptText ? (
                <div className="whitespace-pre-wrap break-words text-[0.72rem] leading-relaxed text-foreground">
                  {transcriptText}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No transcript is available for this lesson.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </FloatingWindow>
  )
}
