"use client"

import { useState } from "react"
import { Terminal, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type DebugLogSectionProps = {
  debugLines: string[]
  onClear?: () => void
}

export function DebugLogSection({
  debugLines,
  onClear,
}: DebugLogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (debugLines.length === 0) {
    return null
  }

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-left transition-colors hover:text-primary"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Debug Log ({debugLines.length} entries)
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="max-h-60 overflow-y-auto rounded-md border bg-muted/20 p-3">
            <div className="space-y-1 font-mono text-[0.7rem]">
              {debugLines.map((line, index) => (
                <div
                  key={`${index}-${line.slice(0, 16)}`}
                  className="flex gap-2 py-0.5"
                >
                  <span className="shrink-0 text-muted-foreground/60">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="break-all text-foreground/80">{line}</span>
                </div>
              ))}
            </div>
          </div>

          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 gap-1.5 text-xs"
            >
              <Trash2 className="h-3 w-3" />
              Clear log
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

