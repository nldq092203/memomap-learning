"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAiAssist } from "@/lib/hooks/use-ai-assist"
import { FormattedAiText } from "@/components/learning/ai/formatted-ai-text"
import { Loader2 } from "lucide-react"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"

interface UsageChallengeProps {
  card: LearningVocabCard
  language: string
}

export function UsageChallenge({ card, language }: UsageChallengeProps) {
  const [sentence, setSentence] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const { askMore, isChatting, settings } = useAiAssist({ learning_lang: language })

  const word = card.word
  const translation = card.translation
  const hasSentence = sentence.trim().length > 0
  const hasFeedback = !!feedback

  let statusLabel = "Not started"
  let statusClass =
    "bg-muted text-muted-foreground border-transparent"
  if (hasFeedback) {
    statusLabel = "Completed"
    statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
  } else if (isChatting) {
    statusLabel = "Checking…"
    statusClass = "bg-primary/10 text-primary border-primary/30"
  } else if (hasSentence) {
    statusLabel = "Draft"
    statusClass = "bg-amber-50 text-amber-700 border-amber-200"
  }

  const handleCheck = async () => {
    const text = sentence.trim()
    if (!text || isChatting) return
    const prompt = [
      `I am learning the word "${word}" in ${language}.`,
      translation ? `Its translation is "${translation}".` : "",
      `Please check if I use "${word}" correctly and naturally in this sentence:`,
      "",
      text,
      "",
      `Give concise feedback suitable for a ${settings.level}-level learner:`,
      `- Point out any mistakes or unnatural phrasing`,
      `- Suggest a corrected version`,
      `- Keep the answer short.`,
    ]
      .filter(Boolean)
      .join("\n")

    try {
      const res = await askMore(prompt, undefined, false)
      if (res?.content) {
        setFeedback(res.content)
      }
    } catch {
      // Errors are surfaced by useAiAssist notification handling
    }
  }

  return (
    <Card
      className={`mt-4 bg-background/40 transition-colors ${
        hasFeedback ? "border-emerald-200 bg-emerald-50/40" : "border-dashed"
      }`}
    >
      <CardHeader
        className="py-3 cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold">Usage challenge</CardTitle>
            <p className="text-xs text-muted-foreground">
              Use{" "}
              <span className="font-semibold">{word}</span>
              {translation ? <> ({translation})</> : null} in 1–2 sentences
              and let AI check it.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusClass}`}
            >
              {statusLabel}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] px-2 py-1 h-auto"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded((prev) => !prev)
              }}
            >
              {isExpanded ? "Hide" : hasFeedback ? "Review" : "Start"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Your sentence
              </label>
              <Textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={`Use "${word}" in a sentence…`}
                disabled={isChatting}
                className="min-h-[80px] text-sm"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault()
                    handleCheck()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Press ⌘+Enter / Ctrl+Enter to send.
                </p>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleCheck}
                  disabled={isChatting || !sentence.trim()}
                  className="gap-1.5"
                >
                  {isChatting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {hasFeedback ? "Check again" : "Check with AI"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>AI feedback</span>
              </div>
              <div className="min-h-[80px] rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {feedback ? (
                  <FormattedAiText text={feedback} />
                ) : (
                  <p>
                    Your feedback will appear here. Focus on natural, everyday
                    language rather than perfection.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
