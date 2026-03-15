"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { QuickExplainData } from "@/lib/types/api/ai"

interface QuickExplainResultProps {
  data: QuickExplainData
  onAddVocab?: (word: string, translation?: string | null, note?: string | null) => void
  onDeepBreakdown?: (word: string) => void
}

export function QuickExplainResult({ data, onAddVocab, onDeepBreakdown }: QuickExplainResultProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-b from-emerald-50/80 to-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">{data.word}</h3>
            <p className="text-xs text-slate-500">{data.pronunciation}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.pos}
            </Badge>
            {data.gender && (
              <Badge variant="secondary" className="text-xs">
                {data.gender === "m" ? "masc." : "fém."}
              </Badge>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm font-medium text-slate-800">{data.meaning}</p>

        {data.example && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm italic text-slate-600">
            {data.example}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onAddVocab && (
          <Button
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onAddVocab(data.word, data.meaning, data.example)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Ajouter
          </Button>
        )}
        {onDeepBreakdown && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onDeepBreakdown(data.word)}
          >
            Analyse approfondie
          </Button>
        )}
      </div>
    </div>
  )
}
