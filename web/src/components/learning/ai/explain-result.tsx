"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
}

export function ExplainResults({
  data,
  rawContent,
  onAddVocab,
  sourceText,
  primaryTranslationLang,
}: ExplainResultsProps) {

  if (!data) {
    return (
      <div className="rounded-md border p-3 text-sm">
        <FormattedAiText text={rawContent} onAdd={(w) => onAddVocab?.(w)} />
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
  const exampleNote = pickExampleNote(data)

  return (
    <div className="space-y-3">
      {/* Translations */}
      {data.translations && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Translations
            </div>
            {onAddVocab && baseWord && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1"
                onClick={() =>
                  onAddVocab(
                    baseWord,
                    preferredTranslation ?? null,
                    exampleNote
                  )
                }
              >
                <Plus className="h-3 w-3" />
                Add to vocab
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.translations).map(([lang, text], idx) => (
              <Badge key={`${lang}-${idx}`} variant="secondary" className="text-xs">
                <span className="font-medium mr-1">{lang.toUpperCase()}:</span>
                {String(text)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Register & Usage */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {data.register && (
          <span>
            Register:{" "}
            <span className="font-medium text-foreground">{data.register}</span>
          </span>
        )}
        {data.usage?.everyday && (
          <Badge variant="outline" className="text-xs">
            Everyday
          </Badge>
        )}
      </div>

      {/* Explanations */}
      {data.explanations && data.explanations.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            Explanations
          </div>
          <ul className="space-y-2 text-sm">
            {data.explanations.map((e, idx) => (
              <li key={idx} className="ml-3">
                <span className="font-medium">{e.fr}</span>
                {e.notes && e.notes.length > 0 && (
                  <ul className="mt-1 ml-3 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {e.notes.map((n, i) => (
                      <li key={`${i}-${n.slice(0, 8)}`}>{n}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Synonyms */}
      {data.synonyms && data.synonyms.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            Synonyms
          </div>
          <div className="space-y-2">
            {data.synonyms.map((s, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm mr-2"
              >
                <span className="font-medium">{s.fr}</span>
                {onAddVocab && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-1"
                    onClick={() =>
                      onAddVocab(
                        s.fr,
                        preferredTranslation ?? null,
                        exampleNote
                      )
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {data.examples && data.examples.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            Examples
          </div>
          <div className="space-y-2">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="rounded-md border p-2 text-sm">
                <div className="font-medium">{ex.fr}</div>
                {ex.translations && (
                  <div className="mt-1 space-y-1 text-xs text-muted-foreground">
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

      {/* Notes */}
      {data.notes && data.notes.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {data.notes.map((n, i) => (
            <div key={`${i}-${n.slice(0, 8)}`}>• {n}</div>
          ))}
        </div>
      )}
    </div>
  )
}
