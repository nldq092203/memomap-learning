"use client"

import { useCallback, useState } from "react"
import { useGlobalShortcuts } from "@/lib/hooks/use-global-shortcuts"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { VocabCardModal } from "@/components/learning/vocabulary/vocab-card-modal"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { notificationService } from "@/lib/services/notification-service"
import type { LocalVocabCard } from "@/lib/types/learning-session"
import type { LearningLanguage } from "@/lib/services/learning-api"

export function GlobalLearningShortcuts() {
  const { lang } = useLearningLang()

  const [isVocabOpen, setIsVocabOpen] = useState(false)
  const [selectedText, setSelectedText] = useState("")

  const addVocabCard = useCallback(
    async (cardData: {
      word: string
      translation: string | null
      notes: string[]
      tags: string[]
    }): Promise<LocalVocabCard> => {
      const trimmedWord = cardData.word.trim()
      if (!trimmedWord) {
        notificationService.error("Word is required")
        return Promise.reject(new Error("Word is required"))
      }

      const language = (lang || "fr") as LearningLanguage

      try {
        const result = await learningVocabApi.bulkImport(language, [
          {
            word: trimmedWord,
            translation: cardData.translation?.trim() || null,
            notes: cardData.notes,
            tags: cardData.tags,
          },
        ])

        const nowIso = new Date().toISOString()
        const created = result?.items?.[0]

        notificationService.success("Added to vocabulary ✨")

        return {
          id: created?.id || `vocab_${Date.now()}`,
          sessionId: "",
          word: created?.word || trimmedWord,
          translation: created?.translation ?? cardData.translation,
          notes: created?.notes || cardData.notes,
          tags: created?.tags || cardData.tags,
          language,
          createdAt: created?.created_at || nowIso,
          updatedAt: created?.updated_at || nowIso,
        }
      } catch (error) {
        console.error("Failed to add vocabulary card from shortcut", error)
        notificationService.error("Failed to add vocabulary card")
        return Promise.reject(error)
      }
    },
    [lang],
  )

  const handleAddVocabShortcut = useCallback(() => {
    if (typeof window === "undefined") return

    const selection = window.getSelection()
    const text = selection?.toString().trim() || ""

    setSelectedText(text)
    setIsVocabOpen(true)
  }, [])

  useGlobalShortcuts({
    addVocab: handleAddVocabShortcut,
  })

  return (
    <VocabCardModal
      isOpen={isVocabOpen}
      onClose={() => setIsVocabOpen(false)}
      onSave={() => {
        // No-op: vocab cards are already saved via API
      }}
      selectedText={selectedText}
      language={lang || "fr"}
      addVocabCard={addVocabCard}
    />
  )
}
