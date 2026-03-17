"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"
import type { DeepBreakdownData } from "@/lib/types/api/ai"

interface DeepBreakdownResultProps {
  data: DeepBreakdownData
  onAddVocab?: (word: string, translation?: string | null, note?: string | null) => void
  onExplainWord?: (word: string) => void
  onGenerateExamples?: (word: string) => void
  onCreateMnemonic?: (word: string) => void
}

export function DeepBreakdownResult({
  data,
  onAddVocab,
  onExplainWord,
  onGenerateExamples,
  onCreateMnemonic,
}: DeepBreakdownResultProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-b from-blue-50/80 to-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{data.word}</h3>
            <p className="text-xs text-slate-500">{data.pronunciation} · {data.pos}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{data.meaning}</p>
          </div>
          {onAddVocab && (
            <Button
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-xs"
              onClick={() => onAddVocab(data.word, data.meaning, null)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Grammar */}
      {data.grammar && (
        <Section title="Grammaire">
          <p className="text-sm text-slate-700">{data.grammar.structure}</p>
          {data.grammar.tense_mood && (
            <p className="text-xs text-slate-500">Temps/mode : {data.grammar.tense_mood}</p>
          )}
          {data.grammar.notes?.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
              {data.grammar.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* Nuance */}
      {data.nuance && (
        <Section title="Nuance">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{data.nuance.register}</Badge>
            <Badge variant="secondary" className="text-xs">{data.nuance.frequency}</Badge>
          </div>
          {data.nuance.notes && (
            <p className="mt-1 text-xs text-slate-600">{data.nuance.notes}</p>
          )}
        </Section>
      )}

      {/* Synonyms */}
      {data.synonyms?.length > 0 && (
        <Section title="Synonymes">
          <div className="space-y-2">
            {data.synonyms.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => onExplainWord?.(s.word)}
                  className="font-medium text-slate-800 hover:text-primary transition"
                >
                  {s.word}
                </button>
                <span className="text-xs text-slate-500">— {s.diff}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* DELF Tips */}
      {data.delf_tips && (
        <Section title={`DELF ${data.delf_tips.level}`}>
          <p className="text-sm text-slate-700">{data.delf_tips.usage}</p>
          <Badge variant="outline" className="mt-1 text-xs">{data.delf_tips.section}</Badge>
        </Section>
      )}

      {/* Collocations */}
      {data.collocations?.length > 0 && (
        <Section title="Collocations">
          <div className="flex flex-wrap gap-1.5">
            {data.collocations.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onExplainWord?.(c)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-primary/30 hover:text-primary transition"
              >
                {c}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Examples */}
      {data.examples?.length > 0 && (
        <Section title="Exemples">
          <div className="space-y-2">
            {data.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/75 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{ex.fr}</p>
                <p className="mt-0.5 text-xs text-slate-500">{ex.translation}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        {onGenerateExamples && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onGenerateExamples(data.word)}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Plus d'exemples
          </Button>
        )}
        {onCreateMnemonic && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onCreateMnemonic(data.word)}
          >
            Mnémonique
          </Button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h4>
      {children}
    </div>
  )
}
