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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4 text-primary font-medium">
          <FileText className="h-5 w-5" />
          <span>Document {transcript.id}</span>
        </div>
        <ScrollArea className="h-[300px] rounded-md border bg-background p-4">
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
