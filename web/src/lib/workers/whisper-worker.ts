/**
 * Whisper Web Worker
 *
 * Runs Whisper transcription in a separate thread to prevent UI blocking
 */

import { pipeline } from "@huggingface/transformers"

// Minimal types for messages passed between main thread and worker
type UiChunk = {
  text: string
  timestamp: [number, number]
}

type TranscribeOptionsMessage = {
  chunk_length_s?: number
  stride_length_s?: number
  language?: string
  task?: string
}

type LoadProgressData = {
  progress?: number
  status?: string
  file?: string
}

// Worker state
let transcriber: unknown = null
let isInitializing = false

// Message types
type WorkerMessage =
  | { type: "load"; modelId: string }
  | { type: "transcribe"; audioData: Float32Array; options: TranscribeOptionsMessage }
  | { type: "ping" }

type WorkerResponse =
  | { type: "load_progress"; progress: number; status?: string; file?: string }
  | { type: "load_complete"; modelId: string }
  | { type: "load_error"; error: string }
  | {
      type: "transcribe_progress"
      progress: number
      status?: string
      processedChunks?: number
      totalChunks?: number
    }
  | { type: "transcribe_chunk"; chunk: UiChunk; chunkIndex: number; totalChunks: number }
  | { type: "transcribe_complete"; result: { text: string; chunks: UiChunk[] } }
  | { type: "transcribe_error"; error: string }
  | { type: "pong" }

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    switch (message.type) {
      case "ping":
        // Health check
        self.postMessage({ type: "pong" } as WorkerResponse)
        break

      case "load":
        await handleLoadModel(message.modelId)
        break

      case "transcribe":
        await handleTranscribe(message.audioData, message.options)
        break

      default:
        console.warn("Unknown message type:", message)
    }
  } catch (error) {
    console.error("Worker error:", error)
    self.postMessage({
      type: "transcribe_error",
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse)
  }
}

/**
 * Load Whisper model
 */
async function handleLoadModel(modelId: string) {
  if (transcriber && !isInitializing) {
    // Already loaded
    self.postMessage({
      type: "load_complete",
      modelId,
    } as WorkerResponse)
    return
  }

  if (isInitializing) {
    // Already loading
    return
  }

  isInitializing = true

  try {
    console.log(`[Worker] Loading model: ${modelId}`)

    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      // Explicitly set device/dtype so the runtime doesn't warn
      device: "wasm",
      dtype: "q8",
      progress_callback: (data: LoadProgressData) => {
        if (typeof data?.progress === "number") {
          const percentage = Math.round(data.progress)
          self.postMessage({
            type: "load_progress",
            progress: percentage,
            status: data.status,
            file: data.file,
          } as WorkerResponse)
        }
      },
    })

    console.log(`[Worker] Model loaded successfully: ${modelId}`)

    self.postMessage({
      type: "load_complete",
      modelId,
    } as WorkerResponse)
  } catch (error) {
    console.error("[Worker] Failed to load model:", error)
    self.postMessage({
      type: "load_error",
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse)
  } finally {
    isInitializing = false
  }
}

/**
 * Transcribe audio from raw PCM (16kHz mono) using manual chunking.
 *
 * We:
 * - Split the input into overlapping chunks
 * - Call the Whisper pipeline once per chunk
 * - Stream each chunk back to the main thread as soon as it's ready
 */
async function handleTranscribe(
  audioData: Float32Array,
  options: TranscribeOptionsMessage
) {
  if (!transcriber) {
    throw new Error("Model not loaded. Call 'load' first.")
  }

  const transcriberFn = transcriber as (
    segment: Float32Array,
    opts: { return_timestamps: boolean; language?: string; task?: string }
  ) => Promise<{ text?: string }>

  console.log("[Worker] Starting transcription...")
  console.log(`[Worker] Audio data: ${audioData.length} samples (Float32Array)`)

  try {
    self.postMessage({
      type: "transcribe_progress",
      status: "Starting inference...",
      progress: 0,
    } as WorkerResponse)

    // Manual chunking parameters
    const sampleRate = 16000 // We decode and resample to 16kHz on the main thread

    // Default to 30s chunks if not provided
    const chunkLengthSec =
      typeof options.chunk_length_s === "number"
        ? options.chunk_length_s
        : 30

    // Default to no overlap unless explicitly provided
    const strideSec =
      typeof options.stride_length_s === "number"
        ? options.stride_length_s
        : 0

    const chunkSize = Math.max(1, Math.floor(chunkLengthSec * sampleRate))
    const strideSize =
      strideSec > 0 ? Math.max(1, Math.floor(strideSec * sampleRate)) : 0
    const hopSize = strideSize > 0 ? Math.max(1, chunkSize - strideSize) : chunkSize

    const totalSamples = audioData.length
    const estimatedChunks =
      totalSamples <= chunkSize
        ? 1
        : Math.ceil((totalSamples - chunkSize) / hopSize) + 1

    console.log(
      `[Worker] Manual chunking: chunkSize=${chunkSize} samples, hop=${hopSize}, estimatedChunks=${estimatedChunks}`
    )

    const allChunks: UiChunk[] = []
    const fullTextParts: string[] = []

    let offset = 0
    let chunkIndex = 0

    while (offset < totalSamples) {
      const end = Math.min(totalSamples, offset + chunkSize)
      const segment = audioData.subarray(offset, end)
      const offsetSeconds = offset / sampleRate

      console.log(
        `[Worker] Processing chunk ${chunkIndex + 1} / ${estimatedChunks} (samples ${offset}→${end})`
      )

      const result = await transcriberFn(segment, {
        return_timestamps: true,
        language: options.language,
        task: options.task || "transcribe",
      })

      // Build a simple chunk object for the UI
      const chunkText: string = result?.text ?? ""
      const chunkTimestamp: [number, number] = [
        offsetSeconds,
        end / sampleRate,
      ]

      const uiChunk = {
        text: chunkText,
        timestamp: chunkTimestamp,
      }

      // Stream this chunk immediately
      self.postMessage({
        type: "transcribe_chunk",
        chunk: uiChunk,
        chunkIndex,
        totalChunks: estimatedChunks,
      } as WorkerResponse)

      // Accumulate for final result
      if (chunkText.trim()) {
        fullTextParts.push(chunkText.trim())
      }
      allChunks.push(uiChunk)

      chunkIndex++
      offset += hopSize
    }

    const totalChunkCount = allChunks.length
    console.log(
      `[Worker] Transcription complete. Got ${totalChunkCount} chunks`
    )

    self.postMessage({
      type: "transcribe_progress",
      status: `Processing ${totalChunkCount} chunks...`,
      progress: 0,
      processedChunks: 0,
      totalChunks: totalChunkCount,
    } as WorkerResponse)

    console.log("[Worker] All chunks streamed")

    // Send final complete result
    const finalResult = {
      text: fullTextParts.join(" ").trim(),
      chunks: allChunks,
    }

    self.postMessage({
      type: "transcribe_complete",
      result: finalResult,
    } as WorkerResponse)
  } catch (error) {
    console.error("[Worker] Transcription failed:", error)
    self.postMessage({
      type: "transcribe_error",
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse)
  } finally {
    // No resource cleanup needed for raw PCM
  }
}

// Export empty object for TypeScript
export {}
