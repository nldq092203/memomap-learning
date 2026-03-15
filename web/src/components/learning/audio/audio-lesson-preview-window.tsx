"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  learningApi,
  type AudioLessonDetail,
  type AudioLessonTimestampSegment,
} from "@/lib/services/learning-api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Pause, Play, RotateCcw, RotateCw, Text } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioLessonPreviewWindowProps {
  lesson: AudioLessonDetail
  onClose: () => void
}

const audioUrlCache = new Map<string, string>()
const audioRequestCache = new Map<string, Promise<string>>()
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const
const WAVE_BARS = [18, 34, 28, 48, 36, 62, 38, 54, 26, 42, 30, 50, 40, 32, 46, 28]

function formatClockTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "--:--"
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function AudioLessonPreviewWindow({
  lesson,
  onClose,
}: AudioLessonPreviewWindowProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [detail, setDetail] = useState<AudioLessonDetail | null>(() => lesson)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number | null>(lesson.durationSeconds ?? null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false)
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)

  const segments: AudioLessonTimestampSegment[] = Array.isArray(detail?.timestamps)
    ? (detail?.timestamps as AudioLessonTimestampSegment[])
    : []
  const transcriptText = (detail?.transcript || "").trim()

  useEffect(() => {
    let cancelled = false

    const loadAudio = async () => {
      const cacheKey = lesson.id
      const cachedUrl = audioUrlCache.get(cacheKey)
      if (cachedUrl) {
        setAudioUrl(cachedUrl)
        return
      }

      const inFlight = audioRequestCache.get(cacheKey)
      if (inFlight) {
        setIsAudioLoading(true)
        try {
          const url = await inFlight
          if (!cancelled) setAudioUrl(url)
        } catch (error) {
          if (!cancelled) {
            setAudioError(
              error instanceof Error ? error.message : "Impossible de charger l'audio."
            )
          }
        } finally {
          if (!cancelled) setIsAudioLoading(false)
        }
        return
      }

      setIsAudioLoading(true)
      setAudioError(null)

      const fetchPromise = (async () => {
        const blob = await learningApi.getAudioLessonAudioBlob(lesson.id)
        const objectUrl = URL.createObjectURL(blob)
        audioUrlCache.set(cacheKey, objectUrl)
        return objectUrl
      })()

      audioRequestCache.set(cacheKey, fetchPromise)

      try {
        const objectUrl = await fetchPromise
        audioRequestCache.delete(cacheKey)
        if (!cancelled) setAudioUrl(objectUrl)
      } catch (error) {
        if (!cancelled) {
          setAudioError(
            error instanceof Error ? error.message : "Impossible de charger l'audio."
          )
        }
      } finally {
        audioRequestCache.delete(cacheKey)
        if (!cancelled) setIsAudioLoading(false)
      }
    }

    void loadAudio()
    return () => {
      cancelled = true
    }
  }, [lesson.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncTime = () => setCurrentTime(audio.currentTime)
    const syncDuration = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : null
      setDuration(nextDuration)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", syncTime)
    audio.addEventListener("loadedmetadata", syncDuration)
    audio.addEventListener("durationchange", syncDuration)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", syncTime)
      audio.removeEventListener("loadedmetadata", syncDuration)
      audio.removeEventListener("durationchange", syncDuration)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  const handleTogglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
      } catch (error) {
        console.error("Impossible de lancer l'audio", error)
      }
      return
    }

    audio.pause()
  }, [])

  const handleJump = useCallback((deltaSeconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + deltaSeconds))
  }, [])

  const handleSeekSegment = useCallback((segment: AudioLessonTimestampSegment) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = segment.startSec
    void audio.play().catch((error) => {
      console.error("Impossible de lire le segment", error)
    })
  }, [])

  const handleToggleTranscript = useCallback(async () => {
    if (isTranscriptVisible) {
      setIsTranscriptVisible(false)
      return
    }

    if (detail?.transcript || (detail?.timestamps && detail.timestamps.length > 0)) {
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
      console.error("Impossible de charger la transcription", error)
      setTranscriptError(
        error instanceof Error ? error.message : "Impossible de charger la transcription."
      )
    } finally {
      setIsTranscriptLoading(false)
    }
  }, [detail, isTranscriptVisible, lesson.id])

  const activeSegmentIndex = useMemo(
    () =>
      segments.findIndex(
        (segment) => currentTime >= segment.startSec && currentTime <= segment.endSec
      ),
    [currentTime, segments]
  )

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} preload="metadata" src={audioUrl ?? undefined} className="hidden" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3 md:gap-5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-slate-400 hover:bg-slate-100"
              onClick={() => handleJump(-5)}
              disabled={isAudioLoading || !!audioError}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={handleTogglePlay}
              disabled={isAudioLoading || !!audioError || !audioUrl}
            >
              {isAudioLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-slate-400 hover:bg-slate-100"
              onClick={() => handleJump(5)}
              disabled={isAudioLoading || !!audioError}
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-end gap-1 overflow-hidden rounded-full bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]">
                  {WAVE_BARS.map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className={cn(
                        "w-1.5 rounded-full bg-emerald-200",
                        index === activeSegmentIndex && "bg-primary",
                        index % 5 === 0 && "bg-emerald-400"
                      )}
                      style={{ height }}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {detail?.name || `Audio ${lesson.id}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lesson.language?.toUpperCase() || "FR"} · {formatClockTime(currentTime)} / {formatClockTime(duration)}
                  </p>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const audio = audioRef.current
                  if (!audio) return
                  audio.currentTime = Number(event.target.value)
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                disabled={!audioUrl || isAudioLoading}
                aria-label="Progression audio"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                    playbackRate === rate
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              onClick={handleToggleTranscript}
              disabled={isTranscriptLoading}
            >
              {isTranscriptLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement
                </>
              ) : (
                <>
                  <Text className="mr-2 h-4 w-4" />
                  {isTranscriptVisible ? "Masquer la transcription" : "Afficher la transcription"}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>

        {audioError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {audioError}
          </div>
        )}
      </div>

      {isTranscriptVisible && (
        <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Transcription d'appui</p>
              <p className="text-xs text-slate-500">
                Gardez-la comme aide secondaire. Cliquez sur une ligne pour relancer l'audio a cet endroit.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {segments.length > 0 ? `${segments.length} segments` : "Texte complet"}
            </Badge>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-[20px] border border-slate-200 bg-white p-3">
            {segments.length > 0 ? (
              <div className="space-y-2">
                {segments.map((segment, index) => {
                  const isActive = index === activeSegmentIndex
                  return (
                    <button
                      key={`${segment.startSec}-${segment.endSec}-${index}`}
                      type="button"
                      onClick={() => handleSeekSegment(segment)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-emerald-50 ring-1 ring-emerald-200"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <span className="shrink-0 font-mono text-[11px] font-medium text-emerald-600">
                        {formatClockTime(segment.startSec)}
                      </span>
                      <span className="text-sm leading-relaxed text-slate-700">
                        {segment.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : transcriptText ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {transcriptText}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {transcriptError || "Aucune transcription disponible pour cet audio."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
