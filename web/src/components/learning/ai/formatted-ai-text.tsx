"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FormattedAiTextProps {
  text: string
  onAdd?: (word: string) => void
}

export function FormattedAiText({ text, onAdd }: FormattedAiTextProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert [&>*]:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">{children}</code>,
          pre: ({ children }) => <pre className="p-2 rounded bg-muted overflow-x-auto my-2">{children}</pre>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
