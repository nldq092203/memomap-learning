import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DelfExtraTranscript } from "@/lib/types/api/delf"
import { formatDelfReadingText } from "@/lib/utils/delf-text"
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

  const textBlocks = formatDelfReadingText(transcript.content)

  return (
    <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2 font-medium text-emerald-700">
          <FileText className="h-5 w-5" />
          <span>Document {transcript.id}</span>
        </div>
        <ScrollArea className="h-[min(62vh,520px)] rounded-[18px] border border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl space-y-4 p-5 sm:p-7">
            {textBlocks.map((block, i) => (
              block.kind === "heading" ? (
                <h4 key={`${block.text}-${i}`} className="whitespace-normal text-base font-bold uppercase leading-7 tracking-wide text-slate-950 sm:text-lg">
                  {block.text}
                </h4>
              ) : (
                <p key={`${block.text}-${i}`} className="whitespace-normal text-[15px] leading-8 text-slate-800 sm:text-base">
                  {block.text}
                </p>
              )
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
