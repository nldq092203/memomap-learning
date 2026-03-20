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
      <Button variant="ghost" onClick={onBack} className="-ml-2 gap-2 rounded-full text-slate-600 hover:bg-white hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" />
        Retour aux sous-thèmes
      </Button>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Séance orale
              </p>
              <h1 className="text-balance break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {content.topic}
              </h1>
              <p className="mt-1 break-words text-sm text-slate-500">
                Travaillez votre expression orale avec des étapes guidées.
              </p>
            </div>
            <Badge className="w-fit shrink-0 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              {currentItemIndex + 1} / {totalItems}
            </Badge>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-slate-500">
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

      <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentItemIndex === 0}
              className="w-full gap-2 rounded-full border-slate-200 text-slate-700 hover:bg-slate-100 sm:w-auto"
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
                      ? "w-8 bg-emerald-400"
                      : index < currentItemIndex
                      ? "w-2 bg-emerald-300"
                      : "w-2 bg-slate-300"
                  }`}
                  title={`Aller à l'étape ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={onNext}
              disabled={currentItemIndex === totalItems - 1}
              className="w-full gap-2 rounded-full border-slate-200 text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              <span className="sm:hidden">Étape suivante</span>
              <span className="hidden sm:inline">Suivant</span>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-emerald-200 bg-emerald-50/50 shadow-sm">
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-950">Conseils d&apos;expression orale</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>• Écoutez chaque audio attentivement avant de répondre.</li>
            <li>• Prenez le temps de structurer vos idées.</li>
            <li>• Répondez à voix haute pour progresser plus vite.</li>
            <li>• Comparez votre réponse avec les modèles proposés.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
