"use client"

import { Copy, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ManualTranscriptSectionProps = {
  value: string
  onChange: (value: string) => void
  copied: boolean
  onCopy: () => void
  disabled?: boolean
}

export function TranscribeManualSection({
  value,
  onChange,
  copied,
  onCopy,
  disabled,
}: ManualTranscriptSectionProps) {
  const handleDownload = () => {
    if (!value) return

    const blob = new Blob([value], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `manual-transcript-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-slate-700">
            3. Transcrivez manuellement
          </h3>
          <p className="text-xs text-slate-500">
            Écoutez l’audio et tapez ce que vous entendez. Vous pouvez modifier librement à tout moment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={!value}
            className="h-8 gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
              {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!value}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger
          </Button>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white px-3 py-2">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="Saisissez votre transcription ici pendant l'écoute…"
          className="min-h-[220px] resize-vertical border-none bg-transparent text-sm leading-relaxed tracking-[0.02em] focus-visible:ring-0"
        />
      </div>
    </section>
  )
}
