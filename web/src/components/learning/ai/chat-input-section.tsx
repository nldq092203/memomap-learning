"use client"

import { Textarea } from "@/components/ui/textarea"
import { useRef } from "react"

interface ChatInputSectionV2Props {
  value: string
  onChange: (value: string) => void
  useContext: boolean
  onUseContextChange: (use: boolean) => void
  onSubmit: (text: string) => void
  isLoading?: boolean
}

export function ChatInputSection({
  value,
  onChange,
  useContext,
  onUseContextChange,
  onSubmit,
  isLoading = false,
}: ChatInputSectionV2Props) {
  const sendingRef = useRef(false)

  const handleSubmit = async () => {
    const q = value.trim()
    if (!q || sendingRef.current || isLoading) return
    try {
      sendingRef.current = true
      onSubmit(q)
    } finally {
      sendingRef.current = false
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={useContext}
          onChange={(e) => onUseContextChange(e.target.checked)}
          disabled={isLoading}
          className="h-3.5 w-3.5 rounded"
        />
        <span className="text-xs text-muted-foreground select-none font-medium">
          Use text as context for better answers
        </span>
      </label>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask a question…"
        className="min-h-20 resize-none"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
    </div>
  )
}
