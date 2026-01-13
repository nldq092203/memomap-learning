"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react"
import { AudioControls } from "./audio-controls"
import { PracticeItem } from "./practice-item"
import type { SpeakingPracticeContent, SpeakingPracticeItem } from "@/lib/types/api/speaking-practice"
import { learningSpeakingApi } from "@/lib/services/learning-speaking-api"

interface PracticePlayerProps {
  content: SpeakingPracticeContent
  currentItemIndex: number
  onNext: () => void
  onPrevious: () => void
  onGoToItem: (index: number) => void
  onBack: () => void
}

export function PracticePlayer({
  content,
  currentItemIndex,
  onNext,
  onPrevious,
  onGoToItem,
  onBack,
}: PracticePlayerProps) {
  const currentItem = content.items[currentItemIndex]
  const totalItems = content.items.length
  const progress = ((currentItemIndex + 1) / totalItems) * 100

  // Determine item type based on ID
  const getItemType = (item: SpeakingPracticeItem): "intro" | "question" | "model" => {
    if (item.id.includes("intro")) return "intro"
    if (item.id.includes("model")) return "model"
    return "question"
  }

  const itemType = getItemType(currentItem)
  const audioUrl = learningSpeakingApi.getAudioUrl(currentItem.audio)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" />
        Back to Subtopics
      </Button>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 backdrop-blur-sm border border-primary/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {content.topic}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Practice speaking with structured exercises
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {currentItemIndex + 1} / {totalItems}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <AudioControls
        audioUrl={audioUrl}
        autoPlay={false}
        onEnded={onNext}
      />

      {/* Practice Item */}
      <PracticeItem item={currentItem} itemType={itemType} />

      {/* Navigation Controls */}
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentItemIndex === 0}
              className="gap-2"
            >
              <SkipBack className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Item Dots */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-md">
              {content.items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onGoToItem(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentItemIndex
                      ? "w-8 bg-primary"
                      : index < currentItemIndex
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                  title={`Go to item ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={onNext}
              disabled={currentItemIndex === totalItems - 1}
              className="gap-2"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-border/60 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">💡 Speaking Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Listen to each audio carefully before responding</li>
            <li>• Take your time to formulate your thoughts</li>
            <li>• Practice speaking out loud for the best results</li>
            <li>• Compare your answer with the model responses</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
