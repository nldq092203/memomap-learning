"use client"

export type WhisperModelId = "Xenova/whisper-tiny" | "Xenova/whisper-base"

export type WhisperChunk = {
  text: string
  timestamp?: [number, number]
}

export type TranscriptionMode = "manual" | "ai"
