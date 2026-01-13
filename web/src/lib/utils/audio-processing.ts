/**
 * Audio Processing Utilities
 */

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "video/webm",
] as const

/**
 * Check if file is a supported audio format
 */
export const isSupportedAudioFile = (file: File): boolean => {
  if (
    ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return true
  }

  const lowerName = file.name.toLowerCase()
  return (
    lowerName.endsWith(".mp3") ||
    lowerName.endsWith(".wav") ||
    lowerName.endsWith(".m4a") ||
    lowerName.endsWith(".webm") ||
    lowerName.endsWith(".ogg")
  )
}

/**
 * Decode and resample audio to 16kHz mono for Whisper
 * This ensures perfect audio quality for the model
 */
export const decodeAudioTo16kHz = async (
  file: File
): Promise<Float32Array> => {
  // Create AudioContext with 16kHz sample rate (Whisper's expected rate)
  const win = window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }

  const AudioContextCtor = win.AudioContext ?? win.webkitAudioContext

  if (!AudioContextCtor) {
    throw new Error("Web Audio API is not supported in this browser.")
  }

  const audioContext = new AudioContextCtor({
    sampleRate: 16000, // Force 16kHz output
  })

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Decode audio data (AudioContext will resample to 16kHz automatically)
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Get mono channel
    let audioData: Float32Array
    if (audioBuffer.numberOfChannels === 1) {
      // Already mono
      audioData = audioBuffer.getChannelData(0)
    } else {
      // Mix stereo to mono
      const left = audioBuffer.getChannelData(0)
      const right = audioBuffer.getChannelData(1)
      audioData = new Float32Array(left.length)
      for (let i = 0; i < left.length; i++) {
        audioData[i] = (left[i] + right[i]) / 2
      }
    }

    return audioData
  } finally {
    // Clean up AudioContext
    await audioContext.close()
  }
}

/**
 * Get audio duration from file
 */
export const getAudioDuration = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    }

    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load audio file"))
    }

    audio.src = url
  })
}

/**
 * Format file size to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const size = bytes / Math.pow(1024, exponent)

  return `${size.toFixed(1)} ${units[exponent]}`
}
