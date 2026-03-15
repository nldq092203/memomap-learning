"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"
import type { GrammarCheckData } from "@/lib/types/api/ai"

const ERROR_TYPE_LABELS: Record<string, string> = {
  spelling: "Orthographe",
  grammar: "Grammaire",
  accent: "Accent",
  conjugation: "Conjugaison",
  agreement: "Accord",
  punctuation: "Ponctuation",
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  spelling: "bg-red-100 text-red-700 border-red-200",
  grammar: "bg-orange-100 text-orange-700 border-orange-200",
  accent: "bg-yellow-100 text-yellow-700 border-yellow-200",
  conjugation: "bg-purple-100 text-purple-700 border-purple-200",
  agreement: "bg-blue-100 text-blue-700 border-blue-200",
  punctuation: "bg-slate-100 text-slate-700 border-slate-200",
}

interface GrammarCheckResultProps {
  data: GrammarCheckData
}

export function GrammarCheckResult({ data }: GrammarCheckResultProps) {
  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        {data.is_correct ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        ) : (
          <XCircle className="h-6 w-6 text-red-500" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {data.is_correct ? "Texte correct !" : `${data.errors.length} erreur${data.errors.length > 1 ? "s" : ""} trouvée${data.errors.length > 1 ? "s" : ""}`}
          </p>
          <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${
                data.score >= 80 ? "bg-emerald-500" : data.score >= 50 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${data.score}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Score : {data.score}/100</p>
        </div>
      </div>

      {/* Corrected text */}
      {!data.is_correct && data.corrected && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
            Texte corrigé
          </p>
          <p className="text-sm text-slate-800">{data.corrected}</p>
        </div>
      )}

      {/* Error list */}
      {data.errors?.length > 0 && (
        <div className="space-y-2">
          {data.errors.map((err, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={`text-[10px] border ${ERROR_TYPE_COLORS[err.type] || "bg-slate-100 text-slate-700"}`}
                >
                  {ERROR_TYPE_LABELS[err.type] || err.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="line-through text-red-600">{err.text}</span>
                <span className="text-slate-400">&rarr;</span>
                <span className="font-medium text-emerald-700">{err.correction}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{err.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Conseils
          </p>
          <ul className="space-y-1 text-xs text-slate-600">
            {data.suggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
