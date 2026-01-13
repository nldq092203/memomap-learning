import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, FileText, ChevronUp, RefreshCw } from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string
  showTranscript: boolean
  onTranscriptToggle: () => void
  isLoadingTranscript: boolean
}

export function AudioPlayer({
  audioUrl,
  showTranscript,
  onTranscriptToggle,
  isLoadingTranscript,
}: AudioPlayerProps) {
  return (
    <Card className="sticky top-16 z-10 mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-card/95 to-primary/5 backdrop-blur-xl shadow-xl shadow-primary/5">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <span>Audio Player</span>
            </div>
            <audio
              controls
              src={audioUrl}
              className="w-full rounded-lg"
              preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
          <Button
            variant={showTranscript ? "default" : "outline"}
            size="lg"
            onClick={onTranscriptToggle}
            disabled={isLoadingTranscript}
            className="gap-2 shrink-0 min-w-[180px] transition-all hover:scale-105"
          >
            {isLoadingTranscript ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : showTranscript ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Transcript
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Show Transcript
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
