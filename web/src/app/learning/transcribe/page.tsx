"use client"

import { useCallback, useRef, useState } from "react"
import { Settings, Info, CheckCircle2, RefreshCw } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog"
import type {
  WhisperModelId,
  TranscriptionMode,
} from "@/components/learning/transcribe/transcribe-types"
import { TranscribeUploadSection } from "@/components/learning/transcribe/transcribe-upload-section"
import { TranscribeModeSection } from "@/components/learning/transcribe/transcribe-mode-section"
import { TranscribeModelSection } from "@/components/learning/transcribe/transcribe-model-section"
import { TranscribeRunSection } from "@/components/learning/transcribe/transcribe-run-section"
import { TranscribeTranscriptSection } from "@/components/learning/transcribe/transcribe-transcript-section"
import { TranscribeManualSection } from "@/components/learning/transcribe/transcribe-manual-section"
import { DebugLogSection } from "@/components/learning/transcribe/debug-log-section"
import { StorageInfoPanel } from "@/components/learning/transcribe/storage-info-panel"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { useTranscription } from "@/lib/hooks/use-transcription"
import {
  getModelApproximateSize,
  isModelLikelyCached,
} from "@/lib/services/whisper-cache"
import {
  isSupportedAudioFile,
  getAudioDuration,
} from "@/lib/utils/audio-processing"
import { Input } from "@/components/ui/input"
import { toast } from "@/lib/toast"

const MODEL_TINY: WhisperModelId = "Xenova/whisper-tiny"
const MODEL_BASE: WhisperModelId = "Xenova/whisper-base"

const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined"

const hasWebGPU = () =>
  typeof navigator !== "undefined" && "gpu" in navigator

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds)) return "Unknown"
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`
}

const getFileBaseName = (name: string): string => {
  const trimmed = name.trim()
  const lastSlash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"))
  const justName = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed
  const lastDot = justName.lastIndexOf(".")
  return lastDot > 0 ? justName.slice(0, lastDot) : justName
}

const LearningTranscribePage = () => {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeModelId, setActiveModelId] = useState<WhisperModelId>(MODEL_TINY)
  const [mode, setMode] = useState<TranscriptionMode>("ai")

  // UI state
  const [showDebugLog, setShowDebugLog] = useState(false)
  const [showStoragePanel, setShowStoragePanel] = useState(false)
  const [debugLines, setDebugLines] = useState<string[]>([])
  const [lessonName, setLessonName] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  )

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { confirm, dialog: confirmDialogNode, setLoading: setConfirmLoading } =
    useConfirmationDialog()
  const { lang } = useLearningLang()

  // Transcription hook
  const {
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
    transcribe,
    copyTranscript,
    reset,
    saveAudioLesson,
    isSavingLesson,
    saveLessonError,
    prepareManualLesson,
    setManualTranscript,
  } = useTranscription()

  const runtimeLabel = hasWebGPU()
    ? "WebGPU available — Hardware acceleration enabled"
    : "WebGPU not available — Running on CPU (slower)"

  const logDebug = useCallback((line: string) => {
    setDebugLines((prev) => [...prev, line])
  }, [])

  const handleClearDebugLog = useCallback(() => {
    setDebugLines([])
  }, [])

  // File handling
  const handleSelectFile = useCallback(
    (file: File | null) => {
      reset()
      setDebugLines([])
      setSaveStatus("idle")

      if (!file) {
        setSelectedFile(null)
        return
      }

      if (!isSupportedAudioFile(file)) {
        setSelectedFile(null)
        logDebug(`❌ Unsupported file format: ${file.type || "unknown"}`)
        return
      }

      logDebug(`✓ Selected: ${file.name} (${file.type}, ${file.size} bytes)`)
      setSelectedFile(file)
    },
    [reset, logDebug]
  )

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const file = event.target.files?.[0] ?? null
        handleSelectFile(file)
      },
      [handleSelectFile]
    )

  const handleDrop: React.DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      const file = event.dataTransfer.files?.[0] ?? null
      handleSelectFile(file)
    },
    [handleSelectFile]
  )

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (!isDragging) setIsDragging(true)
    },
    [isDragging]
  )

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (isDragging) setIsDragging(false)
    },
    [isDragging]
  )

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleDropZoneKeyDown: React.KeyboardEventHandler<HTMLDivElement> =
    useCallback(
      (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleDropZoneClick()
        }
      },
      [handleDropZoneClick]
    )

  const handleSelectModel = useCallback((modelId: WhisperModelId) => {
    setActiveModelId(modelId)
  }, [])

  const handleChangeMode = useCallback((nextMode: TranscriptionMode) => {
    setMode(nextMode)
  }, [])

  // Transcription
  const handleTranscribeClick = useCallback(async () => {
    if (!selectedFile) {
      logDebug("❌ No file selected")
      return
    }

    if (!isSupportedAudioFile(selectedFile)) {
      logDebug("❌ Unsupported audio format")
      return
    }

    if (!isBrowser()) {
      logDebug("❌ Not in browser environment")
      return
    }

    if (!isWorkerReady) {
      logDebug("❌ Web Worker not ready")
      return
    }

    // Check cache state for this model to adapt confirmation message
    const { formatted: approxSize } = getModelApproximateSize(activeModelId)
    const isCached = await isModelLikelyCached(activeModelId)

    const description = isCached
      ? `The "${activeModelId}" model appears to be cached locally. Transcription will start immediately using the local model.`
      : `The "${activeModelId}" model (${approxSize}) will be downloaded and cached in your browser. `
        + "This only needs to be done once per model. Transcription runs in the background, keeping the UI responsive."

    const userAccepted = await new Promise<boolean>((resolve) => {
      confirm({
        title: "Download Whisper model?",
        description,
        confirmText: "Download & Transcribe",
        cancelText: "Cancel",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })

    if (!userAccepted) {
      logDebug("❌ User cancelled")
      return
    }

    try {
      setSaveStatus("idle")
      logDebug(`🎵 Processing: ${selectedFile.name}`)

      // Get duration
      const duration = await getAudioDuration(selectedFile)
      logDebug(`⏱️ Duration: ${duration.toFixed(2)}s`)

      // Transcribe (hook will decode + resample to 16kHz and call worker with raw PCM)
      await transcribe(selectedFile, {
        modelId: activeModelId,
        language: lang,
        onLog: logDebug,
      })
    } catch (error) {
      console.error("Transcription error:", error)
    }
  }, [
    selectedFile,
    activeModelId,
    isWorkerReady,
    lang,
    confirm,
    logDebug,
    transcribe,
  ])

  const handleSaveLessonClick = useCallback(async () => {
    const isManualMode = mode === "manual"

    if (!selectedFile) {
      logDebug("❌ Cannot save lesson: no audio file")
      return
    }

    if (!transcript.trim()) {
      logDebug("❌ Cannot save lesson: no transcript text")
      return
    }

    if (!isManualMode && (errorMessage || isTranscribing || isModelLoading)) {
      return
    }

    const fileName = selectedFile?.name || "Untitled"
    const baseName = selectedFile
      ? getFileBaseName(selectedFile.name)
      : "Untitled"
    const displayName = lessonName.trim() || baseName
    let approxDurationSeconds: number | null = null

    if (!isManualMode && chunks.length > 0) {
      approxDurationSeconds = chunks[chunks.length - 1].timestamp?.[1] ?? null
    } else {
      approxDurationSeconds =
        (await prepareManualLesson(selectedFile, {
          language: lang,
          onLog: logDebug,
        })) ?? null
    }

    const approxDuration = formatDuration(approxDurationSeconds)

    const description = [
      `Lesson: ${displayName}`,
      `File: ${fileName}`,
      `Language: ${lang.toUpperCase()}`,
      `Approx. duration: ${approxDuration}`,
      "",
      "Save this audio and its transcript as a learning lesson in your Drive?",
    ].join("\n")

    confirm({
      title: "Save audio lesson to Drive?",
      description,
      confirmText: "Save",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setSaveStatus("idle")
          setConfirmLoading(true)
          await saveAudioLesson({
            name: displayName,
            languageOverride: lang,
          })
          logDebug("✅ Audio lesson saved to Drive")
          toast.success("Audio lesson saved to Drive")
          setSaveStatus("success")
        } catch (error) {
          console.error("Save audio lesson error:", error)
          logDebug(
            `❌ Failed to save audio lesson: ${
              (error as Error)?.message || String(error)
            }`
          )
          setSaveStatus("error")
          toast.error(
            (error as Error)?.message ||
              "Failed to save audio lesson. Please try again."
          )
        } finally {
          setConfirmLoading(false)
        }
      },
    })
  }, [
    transcript,
    errorMessage,
    isTranscribing,
    isModelLoading,
    saveAudioLesson,
    mode,
    selectedFile,
    chunks,
    lessonName,
    lang,
    prepareManualLesson,
    logDebug,
    confirm,
    setConfirmLoading,
    setSaveStatus,
  ])

  const isManualMode = mode === "manual"
  const isSaveDisabled =
    !selectedFile ||
    !transcript.trim() ||
    isSavingLesson ||
    (!isManualMode && (!!errorMessage || isTranscribing || isModelLoading))

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🎙️ Audio Transcription
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Transcribe audio entirely in your browser using Whisper AI. 100%
            private and free.
          </p>
          <div className="mt-3 max-w-sm">
            <label className="block text-xs font-medium text-muted-foreground">
              Audio Name
            </label>
            <Input
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder={
                selectedFile
                  ? getFileBaseName(selectedFile.name)
                  : "My audio"
              }
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveLessonClick}
            disabled={isSaveDisabled}
            className="h-9"
          >
            {isSavingLesson ? (
              "Saving…"
            ) : saveStatus === "success" ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                All done
              </span>
            ) : saveStatus === "error" ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Retry save
              </span>
            ) : (
              "Save to Drive"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStoragePanel(!showStoragePanel)}
            className="h-9"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardDescription className="text-xs">
              {runtimeLabel}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <TranscribeUploadSection
            selectedFile={selectedFile}
            isDragging={isDragging}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleDropZoneClick}
            onKeyDown={handleDropZoneKeyDown}
            onInputChange={handleInputChange}
            inputRef={fileInputRef}
          />

          <TranscribeModeSection mode={mode} onChangeMode={handleChangeMode} />

          {mode === "manual" ? (
            <TranscribeManualSection
              value={transcript}
              onChange={setManualTranscript}
              copied={copied}
              onCopy={copyTranscript}
              disabled={!selectedFile}
            />
          ) : (
            <>
              <TranscribeModelSection
                activeModelId={activeModelId}
                runtimeLabel=""
                onSelectModel={handleSelectModel}
              />

              <TranscribeRunSection
                onTranscribeClick={handleTranscribeClick}
                isModelLoading={isModelLoading}
                isTranscribing={isTranscribing}
                hasFile={!!selectedFile}
                errorMessage={errorMessage}
                modelProgress={modelProgress}
                processedChunks={processedChunks}
                totalChunks={totalChunks}
              />

              <TranscribeTranscriptSection
                transcript={transcript}
                chunks={chunks}
                streamingChunks={streamingChunks}
                isTranscribing={isTranscribing}
                copied={copied}
                onCopy={copyTranscript}
                transcriptRef={transcriptRef}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Collapsible Panels */}
      {showStoragePanel && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <StorageInfoPanel />
        </div>
      )}

      {debugLines.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugLog(!showDebugLog)}
            className="h-8 text-xs"
          >
            {showDebugLog ? "Hide" : "Show"} Debug Log ({debugLines.length})
          </Button>
        </div>
      )}

      {showDebugLog && debugLines.length > 0 && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <DebugLogSection
            debugLines={debugLines}
            onClear={handleClearDebugLog}
          />
        </div>
      )}

      {saveLessonError && (
        <p className="text-xs text-destructive">
          Failed to save audio lesson: {saveLessonError}
        </p>
      )}

      {confirmDialogNode}
    </main>
  )
}

export default LearningTranscribePage
