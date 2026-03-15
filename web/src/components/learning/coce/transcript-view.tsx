import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CoCeTranscript } from "@/lib/types/api/coce"
import { FileText, RefreshCw } from "lucide-react"

interface TranscriptViewProps {
  transcript: CoCeTranscript | null
  loading: boolean
}

export function TranscriptView({ transcript, loading }: TranscriptViewProps) {
  return (
    <Card className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <FileText className="h-4 w-4" />
          </div>
          Transcription
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading && !transcript ? (
          <div className="flex items-center justify-center px-6 py-12 text-sm text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-teal-600" />
            Chargement de la transcription...
          </div>
        ) : transcript ? (
          <ScrollArea className="h-[260px] px-6 py-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {transcript.transcript}
            </p>
          </ScrollArea>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Transcription indisponible.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
