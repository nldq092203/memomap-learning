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
      <Button variant="ghost" onClick={onBack} className="-ml-2 gap-2 rounded-full text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] hover:text-[var(--vintage-ink)]">
        <ChevronLeft className="h-4 w-4" />
        Retour aux sous-thèmes
      </Button>

      <div className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 p-6 shadow-[0_14px_34px_rgba(74,51,35,0.08)]">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--vintage-desert-rock)]">
                Séance orale
              </p>
              <h1 className="text-balance break-words text-2xl font-semibold tracking-tight text-[var(--vintage-ink)] sm:text-3xl">
                {content.topic}
              </h1>
              <p className="mt-1 break-words text-sm text-[var(--vintage-muted-ink)]">
                Travaillez votre expression orale avec des étapes guidées.
              </p>
            </div>
            <Badge className="w-fit shrink-0 rounded-full bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-cream)]">
              {currentItemIndex + 1} / {totalItems}
            </Badge>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-[var(--vintage-cream)] [&>div]:bg-[var(--vintage-desert-rock)]" />
            <p className="text-xs text-[var(--vintage-muted-ink)]">
              {Math.round(progress)}% terminé
            </p>
          </div>
        </div>
      </div>

      <AudioControls
        audioUrl={audioUrl}
        autoPlay={false}
        onEnded={onNext}
      />

      <PracticeItem item={currentItem} itemType={itemType} />

      <Card className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 shadow-[0_14px_34px_rgba(74,51,35,0.08)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentItemIndex === 0}
              className="w-full gap-2 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)] hover:text-[var(--vintage-ink)] sm:w-auto"
            >
              <SkipBack className="h-4 w-4" />
              <span className="hidden sm:inline">Précédent</span>
              <span className="sm:hidden">Étape précédente</span>
            </Button>

            <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 sm:max-w-md">
              {content.items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onGoToItem(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentItemIndex
                      ? "w-8 bg-[var(--vintage-desert-rock)]"
                      : index < currentItemIndex
                      ? "w-2 bg-[var(--vintage-soft-sandstone)]"
                      : "w-2 bg-[var(--vintage-cream)]"
                  }`}
                  title={`Aller à l'étape ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={onNext}
              disabled={currentItemIndex === totalItems - 1}
              className="w-full gap-2 rounded-full border-[var(--vintage-soft-sandstone)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)] hover:text-[var(--vintage-ink)] sm:w-auto"
            >
              <span className="sm:hidden">Étape suivante</span>
              <span className="hidden sm:inline">Suivant</span>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
