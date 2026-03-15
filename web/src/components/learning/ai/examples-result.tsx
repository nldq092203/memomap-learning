"use client"

import { Badge } from "@/components/ui/badge"
import type { ExampleGeneratorData } from "@/lib/types/api/ai"

interface ExamplesResultProps {
  data: ExampleGeneratorData
  onExplainWord?: (word: string) => void
}

export function ExamplesResult({ data, onExplainWord }: ExamplesResultProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-800">
          Exemples pour &laquo; {data.word} &raquo;
        </h4>
        <Badge variant="outline" className="text-xs">{data.level}</Badge>
      </div>

      <div className="space-y-2">
        {data.examples?.map((ex, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
          >
            <button
              type="button"
              onClick={() => onExplainWord?.(ex.fr)}
              className="text-left text-sm font-medium text-slate-800 hover:text-primary transition"
            >
              {ex.fr}
            </button>
            <p className="text-xs text-slate-500">{ex.translation}</p>
            {ex.context && (
              <p className="text-xs italic text-slate-400">{ex.context}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
