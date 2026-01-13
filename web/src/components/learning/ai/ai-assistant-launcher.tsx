"use client"

import { useEffect, useState } from "react"
import { AiAssistPanel } from "@/components/learning/ai/ai-assist-panel"
import { FloatingWindow } from "@/components/ui/floating-windows"
import { VocabCardModal } from "@/components/learning/vocabulary/vocab-card-modal"
import { DraggableAiBubble } from "@/components/ui/draggable-ai-bubble"
import { useGlobalShortcuts } from "@/lib/hooks/use-global-shortcuts"
import type { LocalVocabCard } from "@/lib/types/learning-session"

export function AiAssistantLauncher({
  learningLang = "fr",
  nativeLang = "vi",
  contextText = "",
  addVocabCard,
}: {
  learningLang?: string
  nativeLang?: string
  contextText?: string
  addVocabCard?: (cardData: {
    word: string
    translation: string | null
    notes: string[]
    tags: string[]
    entryId?: string
  }) => Promise<LocalVocabCard>
}) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState(contextText)

  // Vocab modal state (managed here so modal can be independent)
  const [showVocabModal, setShowVocabModal] = useState(false)
  const [vocabWord, setVocabWord] = useState("")
  const [vocabTranslation, setVocabTranslation] = useState<string | null>(null)
  const [vocabNote, setVocabNote] = useState<string | null>(null)

  const handleOpenVocabModal = (word: string, translation?: string | null, note?: string | null) => {
    setVocabWord(word)
    setVocabTranslation(translation || null)
    setVocabNote(note || null)
    setShowVocabModal(true)
  }

  // Global shortcut (from settings): opens the assistant
  useGlobalShortcuts({
    openAi: () => setOpen(true),
  })

  // Keep internal context synced with prop
  useEffect(() => { setCtx(contextText) }, [contextText])

  // Programmatic open via CustomEvent('open-ai-assistant', { detail: { contextText } })
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ contextText?: string }>
        if (ce?.detail?.contextText !== undefined) setCtx(ce.detail.contextText)
      } catch {}
      setOpen(true)
    }
    window.addEventListener('open-ai-assistant', handler as EventListener)
    return () => window.removeEventListener('open-ai-assistant', handler as EventListener)
  }, [])

  return (
    <>
      <DraggableAiBubble
        storageKey="ai-assistant-bubble-pos"
        onClick={() => setOpen((prev) => !prev)}
      />

      {open && (
        <FloatingWindow
          id="ai-assistant-window"
          title="AI Assistant"
          persistKey="ai-assistant-window"
          defaultWidth={480}
          defaultHeight={520}
          defaultX={80}
          defaultY={80}
          onClose={() => setOpen(false)}
        >
          <AiAssistPanel
            learningLang={learningLang}
            nativeLang={nativeLang}
            contextText={ctx}
            onOpenVocabModal={handleOpenVocabModal}
          />
        </FloatingWindow>
      )}

      {/* Vocabulary Card Modal - Independent of AI window for parallel interaction */}
      {addVocabCard && (
        <VocabCardModal
          isOpen={showVocabModal}
          onClose={() => setShowVocabModal(false)}
          onSave={() => setShowVocabModal(false)}
          selectedText={vocabWord}
          initialTranslation={vocabTranslation}
          initialNote={vocabNote}
          language={learningLang}
          addVocabCard={addVocabCard}
        />
      )}
    </>
  )
}
