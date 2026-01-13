"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Play, FileText } from "lucide-react"
import type { SpeakingTopicManifest } from "@/lib/types/api/speaking-practice"

interface SubtopicListProps {
  topic: SpeakingTopicManifest
  loading: boolean
  onSelectSubtopic: (contentPath: string) => void
  onBack: () => void
}

export function SubtopicList({ topic, loading, onSelectSubtopic, onBack }: SubtopicListProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" />
        Back to Topics
      </Button>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 backdrop-blur-sm border border-primary/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {topic.subtopics.length} {topic.subtopics.length === 1 ? 'Subtopic' : 'Subtopics'}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {topic.title}
          </h1>
          <p className="text-muted-foreground">
            Select a subtopic to begin your speaking practice
          </p>
        </div>
      </div>

      {/* Subtopics List */}
      <div className="space-y-3">
        {topic.subtopics.map((subtopic, index) => (
          <Card
            key={subtopic.id}
            className="group border-border/60 bg-gradient-to-r from-background to-muted/20 transition-all hover:border-primary/40 hover:shadow-md cursor-pointer"
            onClick={() => onSelectSubtopic(subtopic.contentPath)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Number Badge */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight mb-1">
                      {subtopic.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>Practice exercises included</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectSubtopic(subtopic.contentPath)
                  }}
                >
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {topic.subtopics.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No Subtopics Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This topic doesn't have any subtopics yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
