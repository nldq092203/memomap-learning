"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ChevronRight } from "lucide-react"
import type { SpeakingTopic } from "@/lib/types/api/speaking-practice"
import { TrainingSurface } from "@/components/learning/ui"
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
      <section className="space-y-3 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--vintage-desert-rock)]">
          Production orale
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-5xl">
          Entrainement oral
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--vintage-muted-ink)]">
          Choisissez un thème pour pratiquer des exercices de prise de parole structurés.
        </p>
      </section>

      <GuestUpgradeHint description="Connectez-vous pour ouvrir plus de thèmes, plus de sous-thèmes et conserver vos parcours d&apos;oral." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.id)}
            type="button"
            className="group min-h-[210px] rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/88 p-5 text-left shadow-[0_14px_34px_rgba(74,51,35,0.08)] transition hover:-translate-y-0.5 hover:border-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-feather-white)]"
          >
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
                <MessageSquare className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold leading-tight text-[var(--vintage-ink)]">{topic.title}</h2>
                  <p className="mt-2 text-sm font-medium text-[var(--vintage-muted-ink)]">
                    {topic.subtopics_count} {topic.subtopics_count === 1 ? "sous-thème" : "sous-thèmes"}
                  </p>
                </div>
              </div>

              <span className="inline-flex h-10 w-full items-center justify-between rounded-full bg-[var(--vintage-desert-rock)] px-4 text-sm font-semibold text-[var(--vintage-feather-white)] transition group-hover:bg-[#8f7763] sm:w-auto sm:min-w-[180px]">
                Explorer
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {topics.length === 0 && !loading && (
        <TrainingSurface variant="dashed">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-[var(--vintage-desert-rock)]/45" />
            <h3 className="mb-2 font-semibold text-[var(--vintage-ink)]">Aucun thème disponible</h3>
            <p className="max-w-md text-sm text-[var(--vintage-muted-ink)]">
              Aucun contenu d&apos;entrainement oral n&apos;est disponible pour le moment.
            </p>
          </div>
        </TrainingSurface>
      )}
    </div>
  )
}
