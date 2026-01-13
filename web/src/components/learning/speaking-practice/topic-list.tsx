"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ChevronRight } from "lucide-react"
import type { SpeakingTopic } from "@/lib/types/api/speaking-practice"

interface TopicListProps {
  topics: SpeakingTopic[]
  loading: boolean
  onSelectTopic: (topicId: string) => void
}

export function TopicList({ topics, loading, onSelectTopic }: TopicListProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Speaking Practice
        </h1>
        <p className="text-muted-foreground">
          Choose a topic to practice structured speaking exercises
        </p>
      </div>

      {/* Topics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className="group relative overflow-hidden border-border/60 bg-gradient-to-br from-background to-muted/30 transition-all hover:border-primary/40 hover:shadow-lg cursor-pointer"
            onClick={() => onSelectTopic(topic.id)}
          >
            {/* Background Icon */}
            <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
              <MessageSquare className="h-16 w-16 text-primary" />
            </div>

            <CardContent className="relative p-6 space-y-4">
              {/* Icon and Title */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg leading-tight">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {topic.subtopics_count} {topic.subtopics_count === 1 ? 'subtopic' : 'subtopics'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>

              {/* Action Button */}
              <Button
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTopic(topic.id)
                }}
              >
                Explore Topic
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {topics.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No Topics Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no speaking practice topics available at the moment. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
