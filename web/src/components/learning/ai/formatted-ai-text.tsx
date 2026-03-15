"use client"

import React from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FormattedAiTextProps {
  text: string
  onAdd?: (word: string) => void
  onExplainWord?: (word: string) => void
}

function renderInteractiveText(
  value: React.ReactNode,
  onExplainWord?: (word: string) => void
) {
  if (!onExplainWord || typeof value !== "string") return value

  const parts = value.split(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]{1,})/g)
  return parts.map((part, index) => {
    const normalized = part.trim()
    const isFrenchLike = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]{1,}$/.test(normalized)
    if (!isFrenchLike) {
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    }
    return (
      <button
        key={`${normalized}-${index}`}
        type="button"
        onClick={() => onExplainWord(normalized)}
        className="rounded px-0.5 text-left text-inherit underline decoration-primary/35 underline-offset-4 transition hover:text-primary"
      >
        {part}
      </button>
    )
  })
}

export function FormattedAiText({ text, onExplainWord }: FormattedAiTextProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert [&>*]:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{React.Children.map(children, (child) => renderInteractiveText(child, onExplainWord))}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{React.Children.map(children, (child) => renderInteractiveText(child, onExplainWord))}</li>,
          code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">{children}</code>,
          pre: ({ children }) => <pre className="p-2 rounded bg-muted overflow-x-auto my-2">{children}</pre>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
