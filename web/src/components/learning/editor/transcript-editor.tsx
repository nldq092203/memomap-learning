"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"
import { cn } from "@/lib/utils"

export type SerializedTranscript = { text: string }
export type TranscriptEditorHandle = { serialize: () => SerializedTranscript }

type Props = {
  value: string
  onChange: (next: string) => void
  className?: string
  readOnly?: boolean
}

export const TranscriptEditor = forwardRef<TranscriptEditorHandle, Props>(
  function TranscriptEditor({ value, onChange, className, readOnly = false }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    useImperativeHandle(ref, () => ({
      serialize: () => ({ text: textareaRef.current?.value ?? value }),
    }))

    const applyWrapper = (prefix: string, suffix: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      if (start === null || end === null || start === end) return

      const currentValue = textarea.value
      const selected = currentValue.slice(start, end)
      const wrapped = `${prefix}${selected}${suffix}`
      const nextValue =
        currentValue.slice(0, start) + wrapped + currentValue.slice(end)

      textarea.value = nextValue
      onChange(nextValue)

      const innerStart = start + prefix.length
      const innerEnd = innerStart + selected.length

      textarea.selectionStart = innerStart
      textarea.selectionEnd = innerEnd
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return

      const isMod = event.metaKey || event.ctrlKey
      if (!isMod) return

      const key = event.key.toLowerCase()

      if (!event.shiftKey && key === "b") {
        event.preventDefault()
        applyWrapper("**", "**")
        return
      }

      if (!event.shiftKey && key === "i") {
        event.preventDefault()
        applyWrapper("*", "*")
        return
      }

      if (!event.shiftKey && key === "u") {
        event.preventDefault()
        applyWrapper("<u>", "</u>")
        return
      }

      if (event.shiftKey && key === "x") {
        event.preventDefault()
        applyWrapper("~~", "~~")
      }
    }

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        aria-label="Transcript editor"
        className={cn(
          "block w-full min-h-[220px] resize-none bg-transparent outline-none text-[15px] md:text-[16px] leading-relaxed tracking-[0.2px]",
          className,
        )}
      />
    )
  },
)

