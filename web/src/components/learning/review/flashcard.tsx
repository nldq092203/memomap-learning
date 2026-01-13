"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Info, Copy, Volume2 } from "lucide-react"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import { useCallback, useRef, useState } from "react"
import { notificationService } from "@/lib/services/notification-service"

interface FlashcardProps {
  card?: LearningVocabCard
  language: string
  direction: "word_to_translation" | "translation_to_word"
  isFlipped: boolean
  onFlip: () => void
  onInfo: () => void
  maxWidthClass?: string
}

export function Flashcard({
  card,
  language,
  direction,
  isFlipped,
  onFlip,
  onInfo,
  maxWidthClass = "max-w-4xl",
}: FlashcardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSpeakingRef = useRef(false)

  const questionText = direction === "word_to_translation"
    ? (card?.word || "")
    : (card?.translation || "")

  const answerText = direction === "word_to_translation"
    ? (card?.translation || "")
    : (card?.word || "")

  const getFontSizeClass = (text: string | null | undefined, isAnswer: boolean) => {
    const safeText = text ?? ""
    const charLength = safeText.length
    if (isAnswer) {
      if (charLength > 300) return "text-lg"
      if (charLength > 200) return "text-xl"
      if (charLength > 100) return "text-2xl"
      return "text-3xl"
    } else {
      if (charLength > 100) return "text-2xl"
      if (charLength > 50) return "text-3xl"
      return "text-4xl"
    }
  }

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      const text = (isFlipped ? answerText : questionText) ?? ""
      if (!text) return
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement("textarea")
          ta.value = text
          ta.style.position = "fixed"
          ta.style.left = "-9999px"
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand("copy")
          document.body.removeChild(ta)
        }
        notificationService.success(isFlipped ? "Translation copied" : "Word copied")
      } catch {
        notificationService.error("Unable to copy")
      }
    },
    [answerText, questionText, isFlipped]
  )

  const handleSpeak = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      const text = (isFlipped ? answerText : questionText)?.trim() ?? ""
      if (!text) {
        notificationService.info("No text to pronounce")
        return
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        notificationService.warning("Pronunciation is not supported in this browser")
        return
      }

      const synth = window.speechSynthesis

      // Prevent overlapping requests (you can change this to "toggle to stop" if you like)
      if (isSpeakingRef.current) {
        return
      }

      // Normalize language → concrete BCP-47 code
      const normalized = (language || "").toLowerCase()
      let langCode = "en-US"
      if (normalized.startsWith("fr")) langCode = "fr-FR"
      else if (normalized.startsWith("en")) langCode = "en-US"

      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = langCode
      utter.rate = 0.9
      utter.pitch = 1
      utter.volume = 1

      utter.onstart = () => {
        isSpeakingRef.current = true
        setIsSpeaking(true)
      }

      utter.onend = () => {
        isSpeakingRef.current = false
        setIsSpeaking(false)
      }

      utter.onerror = () => {
        isSpeakingRef.current = false
        setIsSpeaking(false)
        notificationService.error("Unable to pronounce this word")
      }

      const speakNow = () => {
        try {
          const voices = synth.getVoices()
          if (voices && voices.length > 0) {
            // Try exact code first, then language prefix (fr-*, en-*)
            const exact = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase())
            const byPrefix = voices.find(v =>
              v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase())
            )
            const chosen = exact || byPrefix || voices[0]
            if (chosen) {
              utter.voice = chosen
            }
          }
          synth.speak(utter)
        } catch {
          isSpeakingRef.current = false
          setIsSpeaking(false)
          notificationService.error("Unable to pronounce this word")
        }
      }

      // If voices not loaded yet, wait for them once
      if (synth.getVoices().length === 0) {
        const handler = () => {
          synth.removeEventListener("voiceschanged", handler)
          speakNow()
        }
        synth.addEventListener("voiceschanged", handler)
        synth.getVoices() // trigger load in some browsers
      } else {
        speakNow()
      }
    },
    [answerText, questionText, isFlipped, language]
  )

  if (!card) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">No cards to review</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex items-center justify-center min-h-0">
      <Card
        className={`w-full ${maxWidthClass} cursor-pointer bg-primary/5 border-2 border-primary/20 hover:border-primary/40 transition-colors flex flex-col items-center justify-center p-8 text-center overflow-hidden`}
        onClick={onFlip}
      >
        <div className="flex w-full items-center justify-end gap-1 mb-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Speak text"
            className={`h-8 w-8 rounded-full ${
              isSpeaking ? "bg-primary/20" : "bg-background/80 hover:bg-background"
            }`}
            onClick={handleSpeak}
          >
            <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy text"
            className="h-8 w-8 rounded-full bg-background/80 hover:bg-background"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Show info"
            className="h-8 w-8 rounded-full bg-background/80 hover:bg-background"
            onClick={e => {
              e.stopPropagation()
              onInfo()
            }}
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {!isFlipped ? (
          <div className="space-y-4 w-full h-full flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wide flex-shrink-0">
              {direction === "word_to_translation" ? language : "Translation"}
            </p>
            <div className="overflow-y-auto max-h-[60%] w-full px-4 flex items-center justify-center">
              <p
                className={`${getFontSizeClass(
                  questionText,
                  false
                )} font-bold text-foreground break-words leading-tight`}
              >
                {questionText}
              </p>
            </div>
            <p className="text-sm text-muted-foreground flex-shrink-0">
              Click to reveal answer
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full h-full flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wide flex-shrink-0">
              {direction === "word_to_translation" ? "Answer" : language}
            </p>
            <div className="overflow-y-auto max-h-[60%] w-full px-4 flex items-center justify-center">
              <p
                className={`${getFontSizeClass(
                  answerText,
                  true
                )} font-semibold text-foreground break-words leading-relaxed`}
              >
                {answerText}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
