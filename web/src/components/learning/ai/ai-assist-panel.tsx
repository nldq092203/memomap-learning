"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useAiAssist } from "@/lib/hooks/use-ai-assist"

import { AiAssistHeader } from "./ai-assist-header"
import { ExplainInputSection } from "./explain-input-section"
import { ExplainResults } from "@/components/learning/ai/explain-result"
import { ChatMessages } from "@/components/learning/ai/chat-message"
import { ChatInputSection } from "@/components/learning/ai/chat-input-section"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { TargetLangsSelector } from "./target-langs-selector"

import { QuickExplainResult } from "./quick-explain-result"
import { DeepBreakdownResult } from "./deep-breakdown-result"
import { ExamplesResult } from "./examples-result"
import { GrammarCheckResult } from "./grammar-check-result"
import { MnemonicResult } from "./mnemonic-result"

import type {
  QuickExplainData,
  DeepBreakdownData,
  ExampleGeneratorData,
  GrammarCheckData,
  MnemonicData,
} from "@/lib/types/api/ai"

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

type AIMode = "explain" | "chat" | "quick" | "deep" | "examples" | "grammar" | "mnemonic"

const MODE_LABELS: Record<AIMode, string> = {
  explain: "Expliquer",
  chat: "Chat",
  quick: "Rapide",
  deep: "Approfondi",
  examples: "Exemples",
  grammar: "Grammaire",
  mnemonic: "Mnémonique",
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
  const [mode, setMode] = useState<AIMode>("explain")
  const {
    settings,
    updateSettings,
    isExplaining,
    isChatting,
    isTaskLoading,
    explain,
    chat,
    explainText,
    askMore,
    quickExplain,
    quickExplainResult,
    deepBreakdown,
    deepBreakdownResult,
    generateExamples,
    examplesResult,
    grammarCheck,
    grammarCheckResult,
    createMnemonic,
    mnemonicResult,
  } = useAiAssist({ learning_lang: learningLang, native_lang: nativeLang })

  const [manualWord, setManualWord] = useState("")
  const [ask, setAsk] = useState("")
  const [useContext, setUseContext] = useState(false)
  const [selected, setSelected] = useState("")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingExplain, setPendingExplain] = useState<string | null>(null)
  const [lastExplainSource, setLastExplainSource] = useState<string>("")

  // Grammar-specific input
  const [grammarText, setGrammarText] = useState("")

  const isLoading = isExplaining || isChatting || isTaskLoading

  const handleExplainWord = async (text: string) => {
    const normalized = (text || "").trim()
    if (!normalized) return
    setManualWord(normalized)
    setLastExplainSource(normalized)
    await explainText(normalized)
    setMode("explain")
  }

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

  const handleExplain = useCallback(async () => {
    const base = willSendExplain
    if (!base) return
    setPendingExplain(base)
    setConfirmOpen(true)
  }, [willSendExplain])

  const handlePrimaryAction = useCallback(async () => {
    if (mode === "chat") {
      const q = (ask || "").trim()
      if (!q) return
      await askMore(q, contextText, useContext)
      setAsk("")
    } else if (mode === "quick") {
      const word = willSendExplain
      if (!word) return
      await quickExplain(word)
    } else if (mode === "deep") {
      const word = willSendExplain
      if (!word) return
      await deepBreakdown(word)
    } else if (mode === "examples") {
      const word = willSendExplain
      if (!word) return
      await generateExamples(word)
    } else if (mode === "grammar") {
      const text = grammarText.trim() || willSendExplain
      if (!text) return
      await grammarCheck(text)
    } else if (mode === "mnemonic") {
      const word = willSendExplain
      if (!word) return
      await createMnemonic(word)
    } else {
      await handleExplain()
    }
  }, [ask, askMore, contextText, createMnemonic, deepBreakdown, generateExamples, grammarCheck, grammarText, handleExplain, mode, quickExplain, useContext, willSendExplain])

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
        if (mode !== "chat") {
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

  const handleAddVocab = (word: string, translation?: string | null, note?: string | null) => {
    onOpenVocabModal?.(word, translation, note)
  }

  // Cross-mode navigation handlers
  const handleSwitchToDeep = (word: string) => {
    setManualWord(word)
    setMode("deep")
    deepBreakdown(word)
  }

  const handleSwitchToExamples = (word: string) => {
    setManualWord(word)
    setMode("examples")
    generateExamples(word)
  }

  const handleSwitchToMnemonic = (word: string) => {
    setManualWord(word)
    setMode("mnemonic")
    createMnemonic(word)
  }

  // Primary modes (always visible)
  const primaryModes: AIMode[] = ["explain", "chat"]
  // Tool modes (collapsible row)
  const toolModes: AIMode[] = ["quick", "deep", "examples", "grammar", "mnemonic"]

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
        mode={mode === "chat" ? "chat" : "explain"}
      />

      <Card className="rounded-[24px] border border-slate-200 bg-background/70 shadow-sm backdrop-blur-md">
        <CardContent className="px-4 py-4">
          <div className="space-y-4">
            {/* Primary mode toggle */}
            <div className="relative grid w-full grid-cols-2 rounded-full bg-slate-100 p-1">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  primaryModes.indexOf(mode as "explain" | "chat") === 1 || !primaryModes.includes(mode)
                    ? "translate-x-full"
                    : "translate-x-0"
                }`}
              />
              {primaryModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === m ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Tool modes */}
            <div className="flex flex-wrap gap-1.5">
              {toolModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    mode === m
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Mode content */}
            {mode === "chat" ? (
              <div className="space-y-4">
                <ChatMessages
                  messages={chat}
                  onAddVocab={handleAddVocab}
                  onExplainWord={handleExplainWord}
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
              </div>
            ) : mode === "grammar" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Texte à vérifier
                  </label>
                  <textarea
                    value={grammarText}
                    onChange={(e) => setGrammarText(e.target.value)}
                    placeholder="Collez ou saisissez votre texte ici pour vérifier la grammaire..."
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handlePrimaryAction()
                      }
                    }}
                    disabled={isTaskLoading}
                  />
                  <p className="text-[11px] text-slate-400">Cmd/Ctrl+Entrée pour analyser</p>
                </div>

                {isTaskLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {grammarCheckResult?.meta?.isJson && grammarCheckResult.content && (
                  <GrammarCheckResult data={grammarCheckResult.content as GrammarCheckData} />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Shared input for explain/quick/deep/examples/mnemonic */}
                <ExplainInputSection
                  manualWord={manualWord}
                  onManualWordChange={setManualWord}
                  selectedText={selected}
                  useContext={useContext}
                  contextText={contextText}
                  onExplain={handlePrimaryAction}
                  isExplaining={isLoading}
                />

                {isTaskLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {/* Explain results */}
                {mode === "explain" && explain && !isExplaining && (
                  <ExplainResults
                    data={explainJson}
                    rawContent={String(explain.content ?? "")}
                    onAddVocab={handleAddVocab}
                    sourceText={lastExplainSource || willSendExplain}
                    primaryTranslationLang={nativeLang}
                    onExplainWord={handleExplainWord}
                  />
                )}

                {/* Quick explain results */}
                {mode === "quick" && quickExplainResult?.meta?.isJson && quickExplainResult.content && !isTaskLoading && (
                  <QuickExplainResult
                    data={quickExplainResult.content as QuickExplainData}
                    onAddVocab={handleAddVocab}
                    onDeepBreakdown={handleSwitchToDeep}
                  />
                )}

                {/* Deep breakdown results */}
                {mode === "deep" && deepBreakdownResult?.meta?.isJson && deepBreakdownResult.content && !isTaskLoading && (
                  <DeepBreakdownResult
                    data={deepBreakdownResult.content as DeepBreakdownData}
                    onAddVocab={handleAddVocab}
                    onExplainWord={handleExplainWord}
                    onGenerateExamples={handleSwitchToExamples}
                    onCreateMnemonic={handleSwitchToMnemonic}
                  />
                )}

                {/* Examples results */}
                {mode === "examples" && examplesResult?.meta?.isJson && examplesResult.content && !isTaskLoading && (
                  <ExamplesResult
                    data={examplesResult.content as ExampleGeneratorData}
                    onExplainWord={handleExplainWord}
                  />
                )}

                {/* Mnemonic results */}
                {mode === "mnemonic" && mnemonicResult?.meta?.isJson && mnemonicResult.content && !isTaskLoading && (
                  <MnemonicResult data={mnemonicResult.content as MnemonicData} />
                )}
              </div>
            )}

            {/* Target langs selector - only for explain mode */}
            {mode === "explain" && (
              <TargetLangsSelector
                targetLangs={settings.target_langs || []}
                onChange={(langs) => updateSettings({ target_langs: langs })}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialog - only for explain mode */}
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Envoyer à l'IA ?"
        description={`Analyser ce texte avec l'IA ?\n\n"${pendingExplain && pendingExplain.length > 100 ? pendingExplain.slice(0, 100) + "..." : pendingExplain || ""}"`}
        confirmText="Envoyer"
        onConfirm={handleConfirm}
        isLoading={false}
      />
    </motion.div>
  )
}
