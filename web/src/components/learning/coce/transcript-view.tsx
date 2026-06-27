import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CoCeTranscript } from "@/lib/types/api/coce"
import { formatReadableText } from "@/lib/text/readable-text"
import { FileText, RefreshCw } from "lucide-react"

interface TranscriptViewProps {
  transcript: CoCeTranscript | null
  loading: boolean
}

export function TranscriptView({ transcript, loading }: TranscriptViewProps) {
  return (
    <Card className="rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
      <CardHeader className="border-b border-[var(--vintage-soft-sandstone)]/70 pb-4">
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-[var(--vintage-ink)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
            <FileText className="h-4 w-4" />
          </div>
          Transcription
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading && !transcript ? (
          <div className="flex items-center justify-center px-6 py-12 text-sm text-[var(--vintage-muted-ink)]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-[var(--vintage-desert-rock)]" />
            Chargement de la transcription...
          </div>
        ) : transcript ? (
          <ScrollArea className="h-[260px] px-6 py-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--vintage-ink)]">
              {formatReadableText(transcript.transcript)}
            </p>
          </ScrollArea>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-[var(--vintage-muted-ink)]">
            Transcription indisponible.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
