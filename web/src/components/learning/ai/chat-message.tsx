"use client"

import { FormattedAiText } from "@/components/learning/ai/formatted-ai-text"
import { MessageCircle, User } from 'lucide-react'
import { useEffect, useRef } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatMessagesProps {
  messages: Message[]
  onAddVocab?: (word: string, translation?: string | null, note?: string | null) => void
}

export function ChatMessages({ messages, onAddVocab }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div ref={containerRef} className="space-y-3 max-h-56 overflow-y-auto pr-1">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">
            Ask anything about the text, grammar, or vocabulary
          </p>
        </div>
      )}
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex gap-2.5 ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
        >
          {m.role === "assistant" && (
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
              <MessageCircle className="h-3.5 w-3.5 text-primary/60" />
            </div>
          )}
          
          <div
            className={`max-w-xs lg:max-w-sm px-3 py-2.5 rounded-lg text-sm ${
              m.role === "assistant"
                ? "bg-muted/50 border border-border/50 text-foreground"
                : "bg-primary/15 border border-primary/20 text-foreground"
            }`}
          >
            {m.role === "assistant" ? (
              <FormattedAiText text={m.content} onAdd={(w) => onAddVocab?.(w)} />
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
          </div>
          
          {m.role === "user" && (
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary/80" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
