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
    <div className="relative flex-1 flex items-center justify-center min-h-0 w-full p-4">
      <Card
        className={`w-full ${maxWidthClass} h-[500px] max-h-full cursor-pointer 
          bg-card border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
          hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)] transition-all duration-300
          relative overflow-hidden rounded-2xl
        `}
        onClick={onFlip}
      >
        {/* Action Buttons (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
           <Button
             variant="ghost"
             size="icon"
             className="h-9 w-9 bg-background/50 hover:bg-background rounded-full backdrop-blur-sm"
             onClick={handleSpeak}
           >
             <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`} />
           </Button>
           <Button
             variant="ghost"
             size="icon"
             className="h-9 w-9 bg-background/50 hover:bg-background rounded-full backdrop-blur-sm"
             onClick={handleCopy}
           >
             <Copy className="h-4 w-4 text-muted-foreground" />
           </Button>
           <Button
             variant="ghost"
             size="icon"
             className="h-9 w-9 bg-background/50 hover:bg-background rounded-full backdrop-blur-sm"
             onClick={e => {
               e.stopPropagation()
               onInfo()
             }}
           >
             <Info className="h-4 w-4 text-muted-foreground" />
           </Button>
        </div>

        {/* Card Content Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-all duration-500"
        >
          {/* Question Section */}
          <div 
            className={`transition-all duration-500 ease-out flex flex-col items-center justify-center w-full
              ${isFlipped ? "-translate-y-16 scale-90" : "translate-y-0 scale-100"}
            `}
          >
             <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
               {direction === "word_to_translation" ? language : "Translation"}
             </p>
             <h2 className={`${getFontSizeClass(questionText, false)} font-bold text-foreground leading-tight`}>
               {questionText}
             </h2>
             {!isFlipped && (
               <p className="mt-8 text-sm text-muted-foreground animate-pulse">
                 Click to reveal
               </p>
             )}
          </div>

          {/* Answer Section */}
          <div 
             className={`absolute top-1/2 left-0 right-0 pt-12 flex flex-col items-center justify-center transition-all duration-500 delay-75
               ${isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}
             `}
          >
             <div className="w-16 h-1 bg-border rounded-full mb-6 mx-auto" />
             <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
               {direction === "word_to_translation" ? "Answer" : language}
             </p>
             <p className={`${getFontSizeClass(answerText, true)} font-medium text-primary leading-relaxed px-8`}>
               {answerText}
             </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
