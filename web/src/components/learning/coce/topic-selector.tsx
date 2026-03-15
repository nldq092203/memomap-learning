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
  { id: "politics", label: "Politique", icon: "🗳️" },
  { id: "health", label: "Sante", icon: "🏥" },
  { id: "environment", label: "Environnement", icon: "🌱" },
  { id: "culture", label: "Culture", icon: "🎭" },
  { id: "technology", label: "Technologie", icon: "💻" },
  { id: "society", label: "Societe", icon: "👥" },
  { id: "economy", label: "Economie", icon: "💰" },
  { id: "science", label: "Sciences", icon: "🔬" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "sports", label: "Sport", icon: "⚽" },
  { id: "food", label: "Alimentation", icon: "🍔" },
  { id: "transport", label: "Transport", icon: "🚗" },
  { id: "housing", label: "Logement", icon: "🏠" },
  { id: "agriculture", label: "Agriculture", icon: "🚜" },
  { id: "music", label: "Musique", icon: "🎵" },
  { id: "art", label: "Art", icon: "🎨" },
  { id: "history", label: "Histoire", icon: "📜" },
  { id: "geography", label: "Geographie", icon: "🌍" },
  { id: "other", label: "Autre", icon: "📦" },
]

export function TopicSelector({ currentTopic, onSelectTopic }: TopicSelectorProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Filtrer par theme</h3>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-2 pb-4">
          <Button
            variant={currentTopic === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectTopic(null)}
            className="rounded-full"
          >
            Tous les themes
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
