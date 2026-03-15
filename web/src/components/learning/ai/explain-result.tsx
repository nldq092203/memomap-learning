"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"
import { FormattedAiText } from "@/components/learning/ai/formatted-ai-text"

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

interface ExplainResultsProps {
  data: ExplainPayload | null
  rawContent: string
  onAddVocab?: (word: string, translation?: string | null, note?: string | null) => void
  sourceText?: string
  primaryTranslationLang?: string
  onExplainWord?: (word: string) => void
}

export function ExplainResults({
  data,
  rawContent,
  onAddVocab,
  sourceText,
  primaryTranslationLang,
  onExplainWord,
}: ExplainResultsProps) {

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <FormattedAiText text={rawContent} onAdd={(w) => onAddVocab?.(w)} onExplainWord={onExplainWord} />
      </div>
    )
  }

  const baseWord = (sourceText || "").trim()

  const pickTranslation = (
    translations?: Record<string, string>,
    preferred?: string
  ): string | null => {
    if (!translations) return null
    if (preferred && translations[preferred]) {
      const v = translations[preferred]
      return v != null ? String(v) : null
    }
    const firstKey = Object.keys(translations)[0]
    if (!firstKey) return null
    const first = translations[firstKey]
    return first != null ? String(first) : null
  }

  const pickExampleNote = (payload: ExplainPayload): string | null => {
    const ex = payload.examples && payload.examples[0]
    if (ex?.fr) {
      return ex.fr
    }
    if (payload.notes && payload.notes.length > 0) {
      return payload.notes[0]
    }
    if (payload.usage?.notes) {
      return payload.usage.notes
    }
    return null
  }

  const preferredTranslation = pickTranslation(
    data.translations,
    primaryTranslationLang
  )
  const englishTranslation = pickTranslation(data.translations, "en")
  const vietnameseTranslation = pickTranslation(data.translations, "vi")
  const exampleNote = pickExampleNote(data)

  return (
    <div className="space-y-5">
      {data.translations && (
        <div className="rounded-[24px] border border-primary/10 bg-[linear-gradient(180deg,rgba(240,253,250,0.95),rgba(248,250,252,0.98))] p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Mot analysé
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  {baseWord || "Expression"}
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {englishTranslation && (
                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">EN</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{englishTranslation}</p>
                  </div>
                )}
                {vietnameseTranslation && (
                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">VI</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{vietnameseTranslation}</p>
                  </div>
                )}
              </div>
            </div>

            {onAddVocab && baseWord && (
              <Button
                size="sm"
                className="h-10 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 text-white shadow-sm hover:brightness-105"
                onClick={() =>
                  onAddVocab(
                    baseWord,
                    preferredTranslation ?? null,
                    exampleNote
                  )
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter au vocabulaire
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {data.register && (
          <span>
            Registre :{" "}
            <span className="font-medium text-foreground">{data.register}</span>
          </span>
        )}
        {data.usage?.everyday && (
          <Badge variant="outline" className="text-xs">
            Usage courant
          </Badge>
        )}
      </div>

      {data.explanations && data.explanations.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            Explications
          </div>
          <ul className="space-y-3 text-sm">
            {data.explanations.map((e, idx) => (
              <li key={idx} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => onExplainWord?.(e.fr)}
                  className="text-left font-medium text-slate-800 transition hover:text-primary"
                >
                  {e.fr}
                </button>
                {e.notes && e.notes.length > 0 && (
                  <ul className="mt-2 ml-3 list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    {e.notes.map((n, i) => (
                      <li key={`${i}-${n.slice(0, 8)}`}>
                        <FormattedAiText text={n} onExplainWord={onExplainWord} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.synonyms && data.synonyms.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            Synonymes
          </div>
          <div className="flex flex-wrap gap-2">
            {data.synonyms.map((s, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onExplainWord?.(s.fr)}
                  className="font-medium text-slate-800 transition hover:text-primary"
                >
                  {s.fr}
                </button>
                <button
                  type="button"
                  onClick={() => onExplainWord?.(s.fr)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-primary/10 hover:text-primary"
                  aria-label={`Expliquer ${s.fr}`}
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.examples && data.examples.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            Exemples
          </div>
          <div className="space-y-2">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/75 px-4 py-3 text-sm">
                <div className="border-l-2 border-primary/35 pl-3">
                  <button
                    type="button"
                    onClick={() => onExplainWord?.(ex.fr)}
                    className="text-left font-medium text-slate-800 transition hover:text-primary"
                  >
                    {ex.fr}
                  </button>
                </div>
                {ex.translations && (
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {Object.entries(ex.translations).map(([lang, t], i) => (
                      <div key={`${lang}-${i}`}>
                        {lang.toUpperCase()}: {String(t)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.notes && data.notes.length > 0 && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {data.notes.map((n, i) => (
            <div key={`${i}-${n.slice(0, 8)}`}>
              <FormattedAiText text={`• ${n}`} onExplainWord={onExplainWord} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
