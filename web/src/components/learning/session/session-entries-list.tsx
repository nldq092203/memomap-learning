"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TranscriptEditor } from "@/components/learning/editor/transcript-editor"
import { 
  Edit3, 
  Trash2, 
  Target,
  Eye,
  EyeOff
} from "lucide-react"

interface SessionEntry {
  id: string
  title: string
  transcript: string
  language?: string
  tags: string[]
  notes: string[]
  comments: string[]
}

interface SessionEntriesListProps {
  entries: SessionEntry[]
  entryTranscripts: Record<string, string>
  editMode: boolean
  selectedEntryId: string | null
  onEntryClick: (entryId: string) => void
  onTranscriptChange: (entryId: string, text: string) => void
  onSaveTranscript: (entryId: string) => void
}

export function SessionEntriesList({
  entries,
  entryTranscripts,
  editMode,
  selectedEntryId,
  onEntryClick,
  onTranscriptChange,
  onSaveTranscript
}: SessionEntriesListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Learning Entries</h2>
      
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onEntryClick(entry.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{entry.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {entry.language?.toUpperCase() || 'N/A'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.transcript.length > 50 
                        ? `${entry.transcript.substring(0, 50)}...`
                        : entry.transcript || "No transcript"
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEntryClick(entry.id)
                    }}
                    className="gap-1"
                  >
                    {selectedEntryId === entry.id ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        Show Details
                      </>
                    )}
                  </Button>
                  {editMode && (
                    <>
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Transcript preview */}
                <div className="text-sm text-muted-foreground">
                  {entry.transcript.length > 100 
                    ? `${entry.transcript.substring(0, 100)}...`
                    : entry.transcript || "No transcript available"
                  }
                </div>
                
                {/* Detailed view when selected */}
                {selectedEntryId === entry.id && (
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Transcript
                      </label>
                      <TranscriptEditor
                        key={`entry-${entry.id}`}
                        value={entryTranscripts[entry.id] || ""}
                        onChange={(text) => onTranscriptChange(entry.id, text)}
                        readOnly
                        className="min-h-[200px]"
                      />
                      {editMode && (
                        <div className="flex justify-end mt-2">
                          <Button 
                            size="sm" 
                            onClick={() => onSaveTranscript(entry.id)}
                          >
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Notes */}
                    {entry.notes && entry.notes.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Notes
                        </label>
                        <div className="space-y-1">
                          {entry.notes.map((note, i) => (
                            <div key={i} className="text-sm p-2 bg-muted rounded">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Comments */}
                    {entry.comments && entry.comments.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Comments
                        </label>
                        <div className="space-y-1">
                          {entry.comments.map((comment, i) => (
                            <div key={i} className="text-sm p-2 bg-muted rounded">
                              {comment}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Linked vocab count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Vocabulary is independent from sessions.
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
