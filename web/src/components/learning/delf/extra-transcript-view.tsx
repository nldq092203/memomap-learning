import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DelfExtraTranscript } from "@/lib/types/api/delf"
import { FileText } from "lucide-react"

interface ExtraTranscriptViewProps {
  transcripts: DelfExtraTranscript[]
  selectedId?: string
}

export function ExtraTranscriptView({ transcripts, selectedId }: ExtraTranscriptViewProps) {
  if (!transcripts || transcripts.length === 0) return null

  // If a specific ID is requested, try to show just that one. 
  // Otherwise, default to the first one.
  const transcript = selectedId 
    ? transcripts.find(t => t.id === selectedId) 
    : transcripts[0]

  if (!transcript) return null

  return (
    <Card className="rounded-[28px] border-emerald-200 bg-emerald-50/60 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2 font-medium text-emerald-700">
          <FileText className="h-5 w-5" />
          <span>Document {transcript.id}</span>
        </div>
        <ScrollArea className="h-[300px] rounded-[20px] border border-slate-200 bg-white p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {transcript.content.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-4 leading-relaxed text-foreground/90">
                {paragraph}
              </p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
