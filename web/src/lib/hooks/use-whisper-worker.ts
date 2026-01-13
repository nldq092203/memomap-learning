/**
 * useWhisperWorker Hook
 * 
 * Manages Web Worker for non-blocking Whisper transcription
 */

import { useCallback, useEffect, useRef, useState } from "react"

type WhisperModelId = "Xenova/whisper-tiny" | "Xenova/whisper-base"

type WorkerChunk = {
  text: string
  timestamp?: [number, number]
}

type TranscribeOptions = {
  return_timestamps?: boolean
  chunk_length_s?: number
  stride_length_s?: number
  language?: string
  task?: string
  onChunk?: (
    chunk: WorkerChunk,
    chunkIndex: number,
    totalChunks: number
  ) => void
}

type TranscribeResult = {
  text: string
  chunks?: Array<{
    text: string
    timestamp?: [number, number]
  }>
}

export function useWhisperWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelProgress, setModelProgress] = useState<number | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Callbacks for async operations
  const loadCallbacksRef = useRef<{
    resolve: (modelId: string) => void
    reject: (error: Error) => void
  } | null>(null)

  const transcribeCallbacksRef = useRef<{
    resolve: (result: TranscribeResult) => void
    reject: (error: Error) => void
    onChunk?: (
      chunk: WorkerChunk,
      chunkIndex: number,
      totalChunks: number
    ) => void
  } | null>(null)

  // Initialize worker
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      // Create worker from file
      const worker = new Worker(
        new URL("../workers/whisper-worker.ts", import.meta.url),
        { type: "module" }
      )

      worker.onmessage = (event: MessageEvent) => {
        const message = event.data as {
          type: string
          progress?: number
          status?: string
          file?: string
          modelId?: string
          error?: string
          chunk?: WorkerChunk
          chunkIndex?: number
          totalChunks?: number
          result?: TranscribeResult
        }

        switch (message.type) {
          case "pong":
            setIsWorkerReady(true)
            break

          case "load_progress":
            setModelProgress(message.progress)
            break

          case "load_complete":
            setIsModelLoading(false)
            setModelProgress(null)
            if (loadCallbacksRef.current) {
              loadCallbacksRef.current.resolve(message.modelId)
              loadCallbacksRef.current = null
            }
            break

          case "load_error":
            setIsModelLoading(false)
            setModelProgress(null)
            setError(message.error)
            if (loadCallbacksRef.current) {
              loadCallbacksRef.current.reject(new Error(message.error))
              loadCallbacksRef.current = null
            }
            break

          case "transcribe_chunk":
            // Stream chunk to callback
            if (transcribeCallbacksRef.current?.onChunk) {
              transcribeCallbacksRef.current.onChunk(
                message.chunk,
                message.chunkIndex,
                message.totalChunks
              )
            }
            break

          case "transcribe_complete":
            setIsTranscribing(false)
            if (transcribeCallbacksRef.current) {
              transcribeCallbacksRef.current.resolve(message.result)
              transcribeCallbacksRef.current = null
            }
            break

          case "transcribe_error":
            setIsTranscribing(false)
            setError(message.error)
            if (transcribeCallbacksRef.current) {
              transcribeCallbacksRef.current.reject(new Error(message.error))
              transcribeCallbacksRef.current = null
            }
            break

          default:
            console.warn("Unknown worker message:", message)
        }
      }

      worker.onerror = (error) => {
        console.error("Worker error:", error)
        setError("Worker failed to initialize")
        setIsWorkerReady(false)
      }

      workerRef.current = worker

      // Ping worker to check if ready
      worker.postMessage({ type: "ping" })

      return () => {
        worker.terminate()
        workerRef.current = null
        setIsWorkerReady(false)
      }
    } catch (error) {
      console.error("Failed to create worker:", error)
      setError("Failed to initialize Web Worker")
    }
  }, [])

  /**
   * Load Whisper model
   */
  const loadModel = useCallback(
    (modelId: WhisperModelId): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isWorkerReady) {
          reject(new Error("Worker not ready"))
          return
        }

        setIsModelLoading(true)
        setModelProgress(0)
        setError(null)

        loadCallbacksRef.current = { resolve, reject }

        workerRef.current.postMessage({
          type: "load",
          modelId,
        })

        // Timeout after 10 minutes
        setTimeout(() => {
          if (loadCallbacksRef.current) {
            loadCallbacksRef.current.reject(
              new Error("Model loading timed out after 10 minutes")
            )
            loadCallbacksRef.current = null
            setIsModelLoading(false)
            setModelProgress(null)
          }
        }, 10 * 60 * 1000)
      })
    },
    [isWorkerReady]
  )

/**
 * Transcribe audio with optional chunk streaming.
 * Accepts raw Float32Array PCM at 16kHz mono.
 */
  const transcribe = useCallback(
    (
      audioData: Float32Array,
      options: TranscribeOptions = {}
    ): Promise<TranscribeResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isWorkerReady) {
          reject(new Error("Worker not ready"))
          return
        }

        setIsTranscribing(true)
        setError(null)

        // Store callbacks including onChunk
        transcribeCallbacksRef.current = {
          resolve,
          reject,
          onChunk: options.onChunk,
        }

        // Remove onChunk from options before sending to worker
        const { onChunk, ...workerOptions } = options

        // Transfer audio data to worker (transferable for performance)
        workerRef.current.postMessage(
          {
            type: "transcribe",
            audioData,
            options: workerOptions,
          },
          [audioData.buffer] // Transfer ownership for better performance
        )

        // Timeout after 10 minutes
        setTimeout(() => {
          if (transcribeCallbacksRef.current) {
            transcribeCallbacksRef.current.reject(
              new Error("Transcription timed out after 20 minutes")
            )
            transcribeCallbacksRef.current = null
            setIsTranscribing(false)
          }
        }, 20 * 60 * 1000)
      })
    },
    [isWorkerReady]
  )

  return {
    isWorkerReady,
    isModelLoading,
    modelProgress,
    isTranscribing,
    error,
    loadModel,
    transcribe,
  }
}
