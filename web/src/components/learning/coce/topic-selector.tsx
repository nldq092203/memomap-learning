"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { ExerciseTopic } from "@/lib/types/api/coce"
import { cn } from "@/lib/utils"

interface TopicSelectorProps {
  currentTopic: ExerciseTopic | null
  onSelectTopic: (topic: ExerciseTopic | null) => void
}

export const TOPICS: { id: ExerciseTopic; label: string; icon: string }[] = [
  { id: "politics", label: "Politics", icon: "🗳️" },
  { id: "health", label: "Health", icon: "🏥" },
  { id: "environment", label: "Environment", icon: "🌱" },
  { id: "culture", label: "Culture", icon: "🎭" },
  { id: "technology", label: "Technology", icon: "💻" },
  { id: "society", label: "Society", icon: "👥" },
  { id: "economy", label: "Economy", icon: "💰" },
  { id: "science", label: "Science", icon: "🔬" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "food", label: "Food", icon: "🍔" },
  { id: "transport", label: "Transport", icon: "🚗" },
  { id: "housing", label: "Housing", icon: "🏠" },
  { id: "agriculture", label: "Agriculture", icon: "🚜" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "art", label: "Art", icon: "🎨" },
  { id: "history", label: "History", icon: "📜" },
  { id: "geography", label: "Geography", icon: "🌍" },
  { id: "other", label: "Other", icon: "📦" },
]

export function TopicSelector({ currentTopic, onSelectTopic }: TopicSelectorProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Filter by Topic</h3>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-2 pb-4">
          <Button
            variant={currentTopic === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectTopic(null)}
            className="rounded-full"
          >
            All Topics
          </Button>
          {TOPICS.map((topic) => (
            <Button
              key={topic.id}
              variant={currentTopic === topic.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                "rounded-full gap-2 transition-all",
                currentTopic === topic.id ? "border-primary/50 ring-2 ring-primary/20" : "opacity-80 hover:opacity-100"
              )}
            >
              <span>{topic.icon}</span>
              {topic.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
