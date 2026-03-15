"use client"

import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { X } from 'lucide-react'

interface ExplainInputSectionProps {
  manualWord: string
  onManualWordChange: (word: string) => void
  selectedText: string
  useContext: boolean
  contextText: string
  onExplain: () => void
  isExplaining: boolean
}

export function ExplainInputSection({
  manualWord,
  onManualWordChange,
  selectedText,
  useContext,
  contextText,
  onExplain,
  isExplaining,
}: ExplainInputSectionProps) {
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    const hasInput =
      manualWord.trim() || selectedText.trim() || (useContext && contextText.trim())
    setShowGuide(!hasInput)
  }, [manualWord, selectedText, useContext, contextText])

  return (
    <div className="space-y-3">
      {/* Guidance */}
      {showGuide && (
        <div className="select-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium">Astuce :</span> sélectionnez un mot ou saisissez une expression, puis lancez l’analyse.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">
          Mot ou expression à expliquer
        </label>
        
        {/* Input field */}
        <div className="relative">
          <Input
            value={manualWord}
            onChange={(e) => onManualWordChange(e.target.value)}
            placeholder="Saisissez un mot ou utilisez la sélection…"
            className="h-10 rounded-2xl border-slate-200 bg-white pr-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onExplain()
              }
            }}
            disabled={isExplaining}
          />
          {manualWord && (
            <button
              onClick={() => onManualWordChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-foreground/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedText && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/8 border border-primary/20 text-xs font-medium text-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
              Sélection : &ldquo;{selectedText.slice(0, 24)}{selectedText.length > 24 ? "..." : ""}&rdquo;
            </div>
          )}
          
          {useContext && !manualWord && contextText && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/8 border border-secondary/20 text-xs font-medium text-foreground/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary/60" />
              Contexte activé
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
