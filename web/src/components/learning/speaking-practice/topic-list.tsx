"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ChevronRight } from "lucide-react"
import type { SpeakingTopic } from "@/lib/types/api/speaking-practice"
import { TrainingChoiceCard, TrainingSectionHeader, TrainingSurface } from "@/components/learning/ui"
import { GuestUpgradeHint } from "@/components/auth/guest-upgrade-hint"

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
      <TrainingSectionHeader
        eyebrow="Production orale"
        title="Entrainement oral"
        description="Choisissez un thème pour pratiquer des exercices de prise de parole structurés."
      />

      <GuestUpgradeHint description="Connectez-vous pour ouvrir plus de thèmes, plus de sous-thèmes et conserver vos parcours d&apos;oral." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <TrainingChoiceCard
            key={topic.id}
            onClick={() => onSelectTopic(topic.id)}
            icon={
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <MessageSquare className="h-6 w-6" />
              </div>
            }
            title={topic.title}
            description={`${topic.subtopics_count} ${topic.subtopics_count === 1 ? "sous-theme" : "sous-themes"}`}
            action={
              <Button
                className="w-full gap-2 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTopic(topic.id)
                }}
              >
                Explorer le thème
                <ChevronRight className="h-4 w-4" />
              </Button>
            }
          />
        ))}
      </div>

      {topics.length === 0 && !loading && (
        <TrainingSurface variant="dashed">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 font-semibold text-slate-950">Aucun thème disponible</h3>
            <p className="max-w-md text-sm text-slate-500">
              Aucun contenu d&apos;entrainement oral n&apos;est disponible pour le moment.
            </p>
          </div>
        </TrainingSurface>
      )}
    </div>
  )
}
