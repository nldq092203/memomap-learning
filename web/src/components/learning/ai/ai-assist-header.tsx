"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sparkles } from 'lucide-react'
import type { CEFRLevel } from "@/lib/types/api/ai"

interface AiAssistHeaderProps {
  level: CEFRLevel
  onLevelChange: (level: CEFRLevel) => void
  onExplain: () => void
  isExplaining: boolean
  isChatting: boolean
  mode: "explain" | "chat"
}

export function AiAssistHeader({
  level,
  onLevelChange,
  onExplain,
  isExplaining,
  isChatting,
  mode,
}: AiAssistHeaderProps) {
  const primaryLabel = mode === "chat"
    ? (isChatting ? "Envoi..." : "Demander")
    : (isExplaining ? "Analyse..." : "Expliquer")

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate">Assistant IA</span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={level} onValueChange={(v: CEFRLevel) => onLevelChange(v)}>
            <SelectTrigger className="h-9 w-24 rounded-full border-slate-200 bg-slate-50 text-slate-700">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent
              className="z-[9999] min-w-[6rem] border border-border bg-white shadow-xl"
              position="popper"
              sideOffset={4}
            >
              {(["A2", "B1", "B2"] as const).map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={onExplain}
            disabled={isExplaining || isChatting}
            className="h-9 rounded-full px-4 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
