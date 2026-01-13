"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TranscriptEditor } from "@/components/learning/editor/transcript-editor"

interface SessionReviewProps {
  session: {
    title: string
    duration: number
  }
  entries: Array<{
    id: string
    title: string
    transcript?: string
    tags?: string[]
    notes?: string[]
    comments?: string[]
  }>
  onClose?: () => void
}

export function SessionReview({ session, entries, onClose }: SessionReviewProps) {
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const hh = h.toString().padStart(2, "0")
    const mm = m.toString().padStart(2, "0")
    const ss = s.toString().padStart(2, "0")
    return `${hh}:${mm}:${ss}`
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <div className="sticky top-14 z-10 h-12 flex items-center justify-between border-b bg-background/80 backdrop-blur px-4 md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{session.title}</h1>
          <Badge variant="secondary" className="text-xs">
            {formatDuration(session.duration)}
          </Badge>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Close Review
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-4 md:gap-6">
          {/* Left: Entries with highlights */}
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{entry.title}</span>
                    <span className="text-xs text-muted-foreground">Entry {index + 1}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[200px] border rounded-md p-3 bg-muted/20">
                    <TranscriptEditor
                      value={entry.transcript || ""}
                      onChange={() => {}}
                      readOnly={true}
                      className="pointer-events-none"
                    />
                  </div>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Tags:</h4>
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {entry.notes && entry.notes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Notes:</h4>
                      <ul className="space-y-1">
                        {entry.notes.map((note, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Comments */}
                  {entry.comments && entry.comments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Comments:</h4>
                      <ul className="space-y-1">
                        {entry.comments.map((comment, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {comment}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right: Session summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Duration</h4>
                <p className="text-sm">{formatDuration(session.duration)}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Entries</h4>
                <p className="text-sm">{entries.length} entry{entries.length !== 1 ? 's' : ''}</p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Total Highlights</h4>
                <p className="text-sm">0</p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Highlight Rules Used</h4>
                <div className="text-sm text-muted-foreground">None</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
