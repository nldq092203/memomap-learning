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
    ? (isChatting ? "Sending..." : "Ask")
    : (isExplaining ? "Explaining..." : "Explain")

  return (
    <div className="rounded-2xl border bg-background/60 backdrop-blur-md shadow-sm p-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Logo and Title */}
        <div className="inline-flex items-center gap-2 text-sm font-semibold flex-shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>AI Assistant</span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Select value={level} onValueChange={(v: CEFRLevel) => onLevelChange(v)}>
            <SelectTrigger className="h-8 w-24 bg-background border">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent
              className="min-w-[6rem] z-[9999] bg-white border border-border shadow-xl"
              position="popper"
              sideOffset={4}
            >
              {(["A2", "B1", "B2", "C1"] as const).map((l) => (
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
            className="gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
