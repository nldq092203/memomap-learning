"use client"

import { Badge } from "@/components/ui/badge"
import { Lightbulb } from "lucide-react"
import type { MnemonicData } from "@/lib/types/api/ai"

const TYPE_LABELS: Record<string, string> = {
  sound: "Son",
  visual: "Visuel",
  story: "Histoire",
  acronym: "Acronyme",
  association: "Association",
}

const TYPE_EMOJI: Record<string, string> = {
  sound: "🔊",
  visual: "🖼️",
  story: "📖",
  acronym: "🔤",
  association: "🔗",
}

interface MnemonicResultProps {
  data: MnemonicData
}

export function MnemonicResult({ data }: MnemonicResultProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h4 className="text-sm font-semibold text-slate-800">
          Mnémoniques pour &laquo; {data.word} &raquo;
        </h4>
      </div>
      <p className="text-xs text-slate-500">{data.meaning}</p>

      {/* Best pick */}
      {data.best_pick && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
            Meilleur choix
          </p>
          <p className="text-sm font-medium text-slate-800">{data.best_pick}</p>
        </div>
      )}

      {/* All mnemonics */}
      {data.mnemonics?.length > 0 && (
        <div className="space-y-2">
          {data.mnemonics.map((m, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{TYPE_EMOJI[m.type] || "💡"}</span>
                <Badge variant="outline" className="text-[10px]">
                  {TYPE_LABELS[m.type] || m.type}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-800">{m.trick}</p>
              <p className="mt-1 text-xs text-slate-500">{m.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
