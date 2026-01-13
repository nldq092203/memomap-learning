/**
 * Manages transcription state and logic
 */

import { useCallback, useRef, useState } from "react"
import { useWhisperWorker } from "./use-whisper-worker"
import type {
  WhisperChunk,
  WhisperModelId,
} from "@/components/learning/transcribe/transcribe-types"
import { decodeAudioTo16kHz, getAudioDuration } from "@/lib/utils/audio-processing"
import {
  learningApi,
  type LearningLanguage,
  type AudioLessonTimestampSegment,
} from "@/lib/services/learning-api"

/**
 * Format raw Whisper transcript where conversational turns are
 * prefixed with "-" into a list of per-turn strings.
 *
 * Example input:
 * "-Salut, ça va ? -Oui, très bien, merci. -OK"
 *
 * Output:
 * ["Salut, ça va ?", "Oui, très bien, merci.", "OK"]
 */
export function formatDashStyleConversation(raw: string): string[] {
  if (!raw) return []

  // Normalize whitespace to avoid odd splits on newlines / tabs
  const normalized = raw.replace(/\s+/g, " ").trim()
  if (!normalized) return []

  // Ensure a leading "-" so the first turn is captured by the split
  const withLeadingDash = normalized.startsWith("-")
    ? normalized
    : `- ${normalized}`

  // Split on "-" that start a new turn (beginning of string or after a space)
  const parts = withLeadingDash
    .split(/(?:^|\s)-\s*/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  return parts
}

/**
 * Merge two transcript fragments while trying to avoid duplicated text
 * caused by overlapping audio chunks (stride_length_s > 0).
 *
 * Strategy:
 * - Look for the longest common suffix of `prev` that matches a prefix of `next`
 *   (up to a reasonable max length).
 * - If found, append only the non-overlapping tail of `next`.
 * - Otherwise, simply concatenate with a space.
 */
function mergeWithOverlap(prev: string, next: string): string {
  const prevNorm = prev.trim()
  const nextNorm = next.trim()

  if (!prevNorm) return nextNorm
  if (!nextNorm) return prevNorm

  const maxOverlap = Math.min(prevNorm.length, nextNorm.length, 80)
  const minOverlap = 20

  for (let len = maxOverlap; len >= minOverlap; len--) {
    const suffix = prevNorm.slice(prevNorm.length - len)
    const prefix = nextNorm.slice(0, len)
    if (suffix === prefix) {
      return `${prevNorm}${nextNorm.slice(len)}`.trim()
    }
  }

  return `${prevNorm} ${nextNorm}`.trim()
}

type TranscriptionOptions = {
  modelId: WhisperModelId
  language?: LearningLanguage
  onLog?: (message: string) => void
}

export function useTranscription() {
  const [transcript, setTranscript] = useState("")
  const [chunks, setChunks] = useState<WhisperChunk[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [streamingChunks, setStreamingChunks] = useState<WhisperChunk[]>([])
  const [processedChunks, setProcessedChunks] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [isSavingLesson, setIsSavingLesson] = useState(false)
  const [saveLessonError, setSaveLessonError] = useState<string | null>(null)

  const transcriptRef = useRef<HTMLPreElement | null>(null)
  const loadedModelsRef = useRef<Set<WhisperModelId>>(new Set())
  const lastAudioFileRef = useRef<File | null>(null)
  const lastAudioDurationRef = useRef<number | null>(null)
  const lastLanguageRef = useRef<LearningLanguage | null>(null)

  const {
    isWorkerReady,
    isModelLoading,
    modelProgress,
    isTranscribing,
    error: workerError,
    loadModel,
    transcribe: transcribeWorker,
  } = useWhisperWorker()

  /**
   * Load Whisper model if not already loaded
   */
  const ensureModelLoaded = useCallback(
    async (modelId: WhisperModelId, onLog?: (msg: string) => void) => {
      if (!isWorkerReady) {
        throw new Error("Web Worker is not ready. Please refresh the page.")
      }

      if (loadedModelsRef.current.has(modelId)) {
        onLog?.(`Model already loaded: ${modelId}`)
        return
      }

      onLog?.(`Loading model: ${modelId}...`)
      await loadModel(modelId)
      loadedModelsRef.current.add(modelId)
      onLog?.(`✓ Model loaded successfully: ${modelId}`)
    },
    [isWorkerReady, loadModel]
  )

  /**
   * Transcribe audio file
   */
  const transcribe = useCallback(
    async (file: File, options: TranscriptionOptions) => {
      const { modelId, language, onLog } = options

      setErrorMessage(null)
      setCopied(false)
      setTranscript("")
      setChunks([])
      setStreamingChunks([])
      setProcessedChunks(0)
      setTotalChunks(0)
      setSaveLessonError(null)

      try {
        lastAudioFileRef.current = file
        lastLanguageRef.current = language ?? null

        // Enforce a conservative upper bound on audio length
        // to keep browser-side transcription reliable.
        const maxDurationSec = 30 * 60 // 30 minutes
        const durationSec = await getAudioDuration(file)
        onLog?.(`Audio duration: ${durationSec.toFixed(2)}s`)

        if (durationSec > maxDurationSec) {
          const message =
            "Audio is longer than 30 minutes. Please select a shorter clip to transcribe."
          setErrorMessage(message)
          onLog?.(message)
          return
        }

        // Ensure model is loaded
        await ensureModelLoaded(modelId, onLog)

        onLog?.("Decoding and resampling audio to 16kHz mono…")

        // Decode and resample audio to 16kHz mono for Whisper
        const audioData = await decodeAudioTo16kHz(file)
        onLog?.(`Audio decoded: ${audioData.length} samples @16kHz`)

        // Approximate duration from decoded PCM length
        lastAudioDurationRef.current =
          audioData.length > 0 ? audioData.length / 16000 : null

        onLog?.("Starting transcription in Web Worker…")
        onLog?.(
          `Options: chunk_length=30s, stride=2s, language=${language || "auto"}`
        )

        // Local accumulator used to build a de-duplicated transcript
        // that mirrors what we stream to the UI.
        let mergedText = ""

        // Transcribe with streaming chunks
        const output = await transcribeWorker(audioData, {
          chunk_length_s: 30,
          stride_length_s: 2,
          // omit stride_length_s to use default 0s overlap in worker
          language,
          task: "transcribe",
          onChunk: (chunk, chunkIndex, totalChunks) => {
            onLog?.(`Chunk ${chunkIndex + 1}/${totalChunks} received`)

            setProcessedChunks(chunkIndex + 1)
            setTotalChunks(totalChunks)

            if (chunk?.text) {
              const whisperChunk: WhisperChunk = {
                text: chunk.text,
                timestamp: chunk.timestamp,
              }

              setStreamingChunks((prev) => [...prev, whisperChunk])

              mergedText = mergeWithOverlap(mergedText, chunk.text)
              setTranscript((prev) => mergeWithOverlap(prev, chunk.text))
            }
          },
        })

        onLog?.("Transcription complete!")

        const rawChunks: WhisperChunk[] = Array.isArray(output?.chunks)
          ? output.chunks
          : []

        setChunks(rawChunks)

        const finalText = mergedText.trim()

        if (!finalText && rawChunks.length === 0) {
          setErrorMessage(
            "Transcription finished but no text was detected. Try a clearer or louder recording."
          )
          onLog?.("Warning: No text detected in transcription")
        }

        // Scroll to transcript
        if (transcriptRef.current) {
          transcriptRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }

        return { text: finalText, chunks: rawChunks }
      } catch (error) {
        console.error("Transcription failed:", error)
        onLog?.(`Error: ${(error as Error)?.message || String(error)}`)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during transcription."
        )
        throw error
      }
    },
    [ensureModelLoaded, transcribeWorker]
  )

  /**
   * Prepare metadata for a manual transcription flow.
   * This sets the last audio file, language and duration so that
   * saveAudioLesson can still reuse the shared persistence logic.
   */
  const prepareManualLesson = useCallback(
    async (
      file: File,
      options?: { language?: LearningLanguage; onLog?: (msg: string) => void }
    ): Promise<number | null> => {
      const language = options?.language
      const onLog = options?.onLog

      lastAudioFileRef.current = file
      lastLanguageRef.current = language ?? null

      try {
        const durationSec = await getAudioDuration(file)
        lastAudioDurationRef.current = durationSec
        onLog?.(`Audio duration: ${durationSec.toFixed(2)}s`)
        return durationSec
      } catch (error) {
        console.error("Failed to read audio duration for manual transcript:", error)
        lastAudioDurationRef.current = null
        return null
      }
    },
    []
  )

  /**
   * Directly set transcript text for manual editing.
   * Resets streaming/chunk state but keeps worker / model state.
   */
  const setManualTranscript = useCallback((value: string) => {
    setTranscript(value)
    setChunks([])
    setStreamingChunks([])
    setProcessedChunks(0)
    setTotalChunks(0)
    setErrorMessage(null)
    setCopied(false)
  }, [])

  /**
   * Copy transcript to clipboard
   */
  const copyTranscript = useCallback(async () => {
    if (!transcript) return

    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setErrorMessage("Failed to copy transcript to clipboard.")
    }
  }, [transcript])

  /**
   * Reset transcription state
   */
  const reset = useCallback(() => {
    setTranscript("")
    setChunks([])
    setStreamingChunks([])
    setProcessedChunks(0)
    setTotalChunks(0)
    setErrorMessage(null)
    setCopied(false)
  }, [])

  /**
   * Save the last transcribed audio + transcript to the backend
   * as a learning audio lesson in Drive.
   */
  const saveAudioLesson = useCallback(
    async (options?: { name?: string; languageOverride?: LearningLanguage }) => {
      if (!lastAudioFileRef.current || !transcript) {
        setSaveLessonError(
          "Nothing to save. Please transcribe an audio file first."
        )
        return
      }

      const language =
        options?.languageOverride ?? lastLanguageRef.current ?? undefined

      try {
        setIsSavingLesson(true)
        setSaveLessonError(null)

        const durationSeconds = lastAudioDurationRef.current ?? undefined
        const timestamps: AudioLessonTimestampSegment[] | undefined =
          chunks.length > 0
            ? chunks.map((c) => ({
                text: c.text,
                startSec: c.timestamp?.[0] ?? 0,
                endSec: c.timestamp?.[1] ?? 0,
              }))
            : undefined

        await learningApi.saveAudioLesson({
          audio: lastAudioFileRef.current,
          transcript,
          language,
          durationSeconds,
          timestamps,
          name: options?.name,
        })
      } catch (error) {
        console.error("Failed to save audio lesson:", error)
        setSaveLessonError(
          error instanceof Error
            ? error.message
            : "Failed to save audio lesson."
        )
        throw error
      } finally {
        setIsSavingLesson(false)
      }
    },
    [transcript, chunks]
  )

  return {
    // State
    transcript,
    chunks,
    streamingChunks,
    errorMessage,
    copied,
    processedChunks,
    totalChunks,
    isWorkerReady,
    isModelLoading,
    modelProgress,
    isTranscribing,
    transcriptRef,

    // Actions
    transcribe,
    copyTranscript,
    reset,
    saveAudioLesson,
    isSavingLesson,
    saveLessonError,

    // Manual helpers
    prepareManualLesson,
    setManualTranscript,
  }
}
