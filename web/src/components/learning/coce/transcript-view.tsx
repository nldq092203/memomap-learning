import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoCeTranscript } from "@/lib/types/api/coce"
import { FileText, RefreshCw } from "lucide-react"

interface TranscriptViewProps {
  transcript: CoCeTranscript | null
  loading: boolean
}

export function TranscriptView({ transcript, loading }: TranscriptViewProps) {
  return (
    <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="border-b border-primary/10 bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading && !transcript ? (
            <div className="flex items-center justify-center py-12">
              <div className="space-y-3 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading transcript...</p>
              </div>
            </div>
          ) : transcript ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {transcript.transcript}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                Transcript not available for this exercise.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
