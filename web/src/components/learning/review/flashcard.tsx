"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AiAssistPanel } from "@/components/learning/ai/ai-assist-panel"
import { Info, Copy, Volume2, Sparkles } from "lucide-react"
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
  const [showAiTutor, setShowAiTutor] = useState(false)
  const isSpeakingRef = useRef(false)

  const questionText = direction === "word_to_translation"
    ? (card?.word || "")
    : (card?.translation || "")

  const answerText = direction === "word_to_translation"
    ? (card?.translation || "")
    : (card?.word || "")
  const secondaryText = direction === "word_to_translation"
    ? (card?.word || "")
    : (card?.translation || "")
  const secondaryLabel = direction === "word_to_translation" ? "Terme source" : "Traduction"
  const exampleSentence = card?.notes?.[0]?.trim() || "Exemple à venir."
  const aiContextText = [
    `Mot: ${card?.word || ""}`,
    `Traduction: ${card?.translation || ""}`,
    `Notes: ${card?.notes?.join(" | ") || ""}`,
  ].join("\n")

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
    <>
    <div className="relative flex-1 flex items-center justify-center min-h-0 w-full p-2 md:p-4">
      <Card
        className={`w-full ${maxWidthClass} h-[520px] max-h-full cursor-pointer border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))]
          shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] transition-all duration-300 hover:shadow-[0_24px_70px_-36px_rgba(15,23,42,0.32)]
          relative overflow-hidden rounded-[28px] backdrop-blur
        `}
        onClick={onFlip}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.08),transparent_70%)]" />

        {/* Action Buttons (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/60 bg-background/70 backdrop-blur-sm hover:bg-background"
            onClick={handleSpeak}
          >
            <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/60 bg-background/70 backdrop-blur-sm hover:bg-background"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/60 bg-background/70 backdrop-blur-sm hover:bg-background"
            onClick={e => {
              e.stopPropagation()
              onInfo()
            }}
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="absolute inset-0 [perspective:1600px]">
          <div
            className={`relative h-full w-full [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
            }`}
          >
            <div className="absolute inset-0 flex flex-col justify-center px-8 py-10 text-center [backface-visibility:hidden] md:px-12">
              <div className="mx-auto flex max-w-3xl flex-col items-center">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  {direction === "word_to_translation" ? language : "Traduction"}
                </p>
                <div className="flex items-start justify-center gap-3">
                  <h2 className={`${getFontSizeClass(questionText, false)} font-semibold text-slate-800 leading-tight`}>
                    {questionText}
                  </h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAiTutor(true)
                    }}
                    className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition hover:bg-primary/10"
                    aria-label="Ouvrir le tuteur IA"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
                {!isFlipped && (
                  <p className="mt-8 text-sm text-slate-500">
                    Appuyez pour révéler la réponse
                  </p>
                )}
              </div>
            </div>

            <div className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col justify-between px-8 py-10 [backface-visibility:hidden] md:px-12">
              <div className="flex h-full flex-col">
                <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-slate-200" />
                <div className="mb-6 text-center">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Réponse
                  </p>
                  <div className="flex items-start justify-center gap-3">
                    <p className={`${getFontSizeClass(answerText, true)} font-semibold text-slate-800 leading-relaxed`}>
                      {answerText}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAiTutor(true)
                      }}
                      className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition hover:bg-primary/10"
                      aria-label="Ouvrir le tuteur IA"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mx-auto grid w-full max-w-2xl gap-5 rounded-[24px] border border-slate-200 bg-white/80 px-5 py-5 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-2 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Sens principal
                    </p>
                    <p className="text-lg font-medium text-slate-800">
                      {answerText}
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {secondaryLabel}
                    </p>
                    <p className="text-base text-slate-600">
                      {secondaryText}
                    </p>
                  </div>
                </div>

                <div className="mt-auto rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Exemple
                  </p>
                  <p className="mt-2 text-sm italic leading-6 text-slate-500">
                    {exampleSentence}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
    <Sheet open={showAiTutor} onOpenChange={setShowAiTutor}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-slate-200 bg-background/95 px-0 sm:max-w-xl">
        <SheetHeader className="px-6 pb-4">
          <SheetTitle className="text-base font-semibold text-slate-900">
            Tuteur IA
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6">
          <AiAssistPanel
            learningLang={language}
            contextText={aiContextText}
          />
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
