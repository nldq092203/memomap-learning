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
  const [isExpanded, setIsExpanded] = useState(true)
  const { askMore, isChatting, settings } = useAiAssist({ learning_lang: language })

  const word = card.word
  const translation = card.translation
  const hasSentence = sentence.trim().length > 0
  const hasFeedback = !!feedback

  let statusLabel = "Ready"
  let statusClass = "bg-muted text-muted-foreground"
  
  if (hasFeedback) {
    statusLabel = "Feedback received"
    statusClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  } else if (isChatting) {
    statusLabel = "AI is thinking…"
    statusClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  } else if (hasSentence) {
    statusLabel = "Drafting"
    statusClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
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
      if (res?.response) {
        setFeedback(res.response)
      }
    } catch {
      // Errors are surfaced by useAiAssist notification handling
    }
  }

  return (
    <Card className="mt-6 border shadow-sm bg-card/95 backdrop-blur overflow-hidden transition-all duration-300">
      <CardHeader className="py-4 px-6 border-b bg-muted/20 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span>✨</span> Practice Sentence
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Write a sentence using <span className="font-bold text-foreground mx-0.5">{word}</span>
            {translation && <span> ({translation})</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
             {statusLabel}
           </span>
           <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsExpanded(!isExpanded)}>
             {isExpanded ? "−" : "+"}
           </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Section */}
            <div className="flex flex-col gap-3">
               <Textarea
                 value={sentence}
                 onChange={(e) => setSentence(e.target.value)}
                 placeholder={`Example: I used the ${word} to...`}
                 disabled={isChatting}
                 className="min-h-[120px] resize-none text-base p-4 bg-muted/30 focus:bg-background transition-colors border-muted-foreground/20 focus-visible:ring-primary/20"
                 onKeyDown={(e) => {
                   if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                     e.preventDefault()
                     handleCheck()
                   }
                 }}
               />
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">⌘ + Enter to submit</span>
                 <Button
                   size="sm"
                   onClick={handleCheck}
                   disabled={isChatting || !sentence.trim()}
                   className="gap-2 font-semibold"
                 >
                   {isChatting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                   {hasFeedback ? "Check Again" : "Ask AI to Check"}
                 </Button>
               </div>
            </div>

            {/* Feedback Section */}
            <div className="relative flex flex-col h-full min-h-[120px] rounded-xl border bg-muted/10 p-0 overflow-hidden">
               <div className="bg-muted/30 px-4 py-2 border-b flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-muted-foreground">AI Tutor Feedback</span>
               </div>
               <div className="p-4 text-sm leading-relaxed text-foreground/90 flex-1 overflow-y-auto">
                 {feedback ? (
                   <FormattedAiText text={feedback} />
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-4">
                     <p>I&apos;m ready to review your sentence.</p>
                     <p className="text-xs opacity-70 mt-1">Focus on natural usage!</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
