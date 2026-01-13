"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { useAiAssist } from "@/lib/hooks/use-ai-assist"

import { AiAssistHeader } from "./ai-assist-header"
import { ExplainInputSection } from "./explain-input-section"
import { ExplainResults } from "@/components/learning/ai/explain-result"
import { ChatMessages } from "@/components/learning/ai/chat-message"
import { ChatInputSection } from "@/components/learning/ai/chat-input-section"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { TargetLangsSelector } from "./target-langs-selector"

type ExplainPayload = {
  translations?: Record<string, string>
  register?: string
  usage?: { everyday?: boolean; notes?: string }
  detected_language?: string
  explanations?: Array<{ fr: string; notes?: string[] }>
  synonyms?: Array<{ fr: string }>
  examples?: Array<{ fr: string; translations?: Record<string, string> }>
  notes?: string[]
}

function currentSentence(text: string): string {
  const trimmed = (text || "").trim()
  if (!trimmed) return ""
  const parts = trimmed.split(/(?<=[.!?])\s+/)
  return parts[parts.length - 1] || trimmed
}

export function AiAssistPanel({
  learningLang = "fr",
  nativeLang = "vi",
  contextText = "",
  onOpenVocabModal,
}: {
  learningLang?: string
  nativeLang?: string
  contextText?: string
  onOpenVocabModal?: (word: string, translation?: string | null, note?: string | null) => void
}) {
  const [mode, setMode] = useState<"explain" | "chat">("explain")
  const {
    settings,
    updateSettings,
    isExplaining,
    isChatting,
    explain,
    chat,
    explainText,
    askMore,
  } = useAiAssist({ learning_lang: learningLang, native_lang: nativeLang })

  const [manualWord, setManualWord] = useState("")
  const [ask, setAsk] = useState("")
  const [useContext, setUseContext] = useState(false)
  const [selected, setSelected] = useState("")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingExplain, setPendingExplain] = useState<string | null>(null)
  const [lastExplainSource, setLastExplainSource] = useState<string>("")

  // Track selection live
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setSelected("")
        return
      }
      const node = sel.anchorNode as Node | null
      if (node && panelRef.current && panelRef.current.contains(node)) {
        return
      }
      setSelected(sel.toString() || "")
    }
    document.addEventListener("selectionchange", onSel)
    return () => document.removeEventListener("selectionchange", onSel)
  }, [])

  // Preview for Explain
  const willSendExplain = useMemo(() => {
    const manual = manualWord.trim()
    if (manual) return manual
    const ctx = useContext ? currentSentence(contextText) : ""
    return (selected || ctx || "").trim()
  }, [manualWord, selected, useContext, contextText])

  const handleExplain = async () => {
    const base = willSendExplain
    if (!base) return
    setPendingExplain(base)
    setConfirmOpen(true)
  }

  const handlePrimaryAction = async () => {
    if (mode === "chat") {
      const q = (ask || "").trim()
      if (!q) return
      await askMore(q, contextText, useContext)
      setAsk("")
    } else {
      await handleExplain()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      if (!panelRef.current || !active || !panelRef.current.contains(active))
        return
      const ne = e as unknown as { isComposing?: boolean }
      if (ne?.isComposing) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault()
        handleExplain()
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (mode === "explain") {
          e.preventDefault()
          handlePrimaryAction()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, handleExplain, handlePrimaryAction])

  // Keep assistant language synced
  useEffect(() => {
    if (learningLang && settings.learning_lang !== learningLang) {
      updateSettings({ learning_lang: learningLang })
    }
  }, [learningLang, settings.learning_lang, updateSettings])

  // Parse explain JSON
  const explainJson = useMemo<ExplainPayload | null>(() => {
    if (!explain) return null
    if (explain.meta?.isJson) return explain.content as unknown as ExplainPayload
    const raw = String(explain.content ?? "").trim()
    if (!raw) return null
    let body = raw
    const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    if (fenced && fenced[1]) body = fenced[1].trim()
    try {
      const obj = JSON.parse(body) as unknown as ExplainPayload
      return obj
    } catch {
      return null
    }
  }, [explain])

  const handleConfirm = async () => {
    if (!pendingExplain) return
    const text = pendingExplain
    setPendingExplain(null)
    setLastExplainSource(text)
    await explainText(text)
    setMode("explain")
  }

  // Handle adding vocab - notify parent to show modal
  const handleAddVocab = (word: string, translation?: string | null, note?: string | null) => {
    onOpenVocabModal?.(word, translation, note)
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="space-y-3"
    >
      <AiAssistHeader
        level={settings.level}
        onLevelChange={(level) => updateSettings({ level })}
        onExplain={handlePrimaryAction}
        isExplaining={isExplaining}
        isChatting={isChatting}
        mode={mode}
      />

      <Card className="border bg-background/60 backdrop-blur-md rounded-xl shadow-sm">
        <CardContent className="px-4 py-4">
          <Tabs
            value={mode}
            onValueChange={(v: "explain" | "chat") => setMode(v)}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="explain" className="text-xs font-medium">
                Explain
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs font-medium">
                Ask More
              </TabsTrigger>
            </TabsList>

            {/* Explain Tab */}
            <TabsContent value="explain" className="space-y-4">
              <ExplainInputSection
                manualWord={manualWord}
                onManualWordChange={setManualWord}
                selectedText={selected}
                useContext={useContext}
                contextText={contextText}
                onExplain={handleExplain}
                isExplaining={isExplaining}
              />

              {/* Results */}
              {explain && (
                <ExplainResults
                  data={explainJson}
                  rawContent={String(explain.content ?? "")}
                  onAddVocab={handleAddVocab}
                  sourceText={lastExplainSource || willSendExplain}
                  primaryTranslationLang={nativeLang}
                />
              )}
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4">
              <ChatMessages
                messages={chat}
                onAddVocab={handleAddVocab}
              />

              <ChatInputSection
                value={ask}
                onChange={setAsk}
                useContext={useContext}
                onUseContextChange={setUseContext}
                onSubmit={async (q) => {
                  await askMore(q, contextText, useContext)
                  setAsk("")
                }}
                isLoading={isChatting}
              />
            </TabsContent>
          </Tabs>

          <TargetLangsSelector
            targetLangs={settings.target_langs || []}
            onChange={(langs) => updateSettings({ target_langs: langs })}
          />
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send to AI?"
        description={`Explain this text with AI?\n\n"${pendingExplain && pendingExplain.length > 100 ? pendingExplain.slice(0, 100) + "..." : pendingExplain || ""}"`}
        confirmText="Send"
        onConfirm={handleConfirm}
        isLoading={false}
      />
    </motion.div>
  )
}
