"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { SpeakingTopicManifest } from "@/lib/types/api/speaking-practice"
import { TrainingSurface } from "@/components/learning/ui"
import {
  Apple,
  ArrowLeft,
  BookOpen,
  Clock3,
  Globe2,
  Leaf,
  MessageSquareQuote,
  Mic2,
  Play,
  Sparkles,
  TrendingUp,
} from "lucide-react"

interface SubtopicListProps {
  topic: SpeakingTopicManifest
  loading: boolean
  onSelectSubtopic: (contentPath: string) => void
  onBack: () => void
}

const SUBTOPIC_STYLES = [
  {
    icon: Apple,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
  {
    icon: TrendingUp,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
  {
    icon: Globe2,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
  {
    icon: Leaf,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
  {
    icon: BookOpen,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
  {
    icon: Sparkles,
    accent: "text-[var(--vintage-desert-rock)]",
    iconBg: "bg-[var(--vintage-cream)]",
  },
]

function getEstimatedTime(title: string, index: number) {
  const base = 10 + (title.length % 4) * 3 + (index % 3) * 2
  return `${base} min`
}

function getTopicTags(title: string) {
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const keywordMap: Array<{ keywords: string[]; tag: string }> = [
    { keywords: ["aliment", "sante", "nutrition"], tag: "#Sante" },
    { keywords: ["bio", "ecolo", "durable"], tag: "#Bio" },
    { keywords: ["tendance", "trend", "reseaux"], tag: "#Tendances" },
    { keywords: ["travail", "emploi", "carriere"], tag: "#Travail" },
    { keywords: ["ecole", "etude", "universite"], tag: "#Etudes" },
    { keywords: ["culture", "art", "cinema"], tag: "#Culture" },
    { keywords: ["voyage", "tourisme", "transport"], tag: "#Voyage" },
    { keywords: ["ville", "quartier", "logement"], tag: "#Ville" },
    { keywords: ["technologie", "numerique", "internet"], tag: "#Numerique" },
    { keywords: ["environnement", "climat", "nature"], tag: "#Climat" },
    { keywords: ["famille", "social", "societe"], tag: "#Societe" },
    { keywords: ["consommation", "achat", "prix"], tag: "#Conso" },
  ]

  const tags = keywordMap
    .filter(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(({ tag }) => tag)

  if (tags.length >= 3) {
    return tags.slice(0, 4)
  }

  const fallbackWords = normalized
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3)
    .slice(0, 4)
    .map((word) => `#${word.charAt(0).toUpperCase()}${word.slice(1)}`)

  return [...new Set([...tags, ...fallbackWords, "#Oral", "#B2"])].slice(0, 4)
}

export function SubtopicList({ topic, loading, onSelectSubtopic, onBack }: SubtopicListProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} className="h-[260px] rounded-[28px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-medium text-[var(--vintage-muted-ink)] transition hover:text-[var(--vintage-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux thèmes
      </button>

      <section className="space-y-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--vintage-desert-rock)]">
            Sous-thèmes
          </p>
          <Badge className="rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)]">
            {topic.subtopics.length} {topic.subtopics.length === 1 ? "sous-thème" : "sous-thèmes"}
          </Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--vintage-ink)] md:text-5xl">
          {topic.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--vintage-muted-ink)]">
          Choisissez une pratique orale guidée.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topic.subtopics.map((subtopic, index) => {
          const style = SUBTOPIC_STYLES[index % SUBTOPIC_STYLES.length]
          const Icon = style.icon
          const tags = getTopicTags(subtopic.title)
          const time = getEstimatedTime(subtopic.title, index)

          return (
            <button
              key={subtopic.id}
              onClick={() => onSelectSubtopic(subtopic.contentPath)}
              type="button"
              className="group relative min-h-[250px] overflow-hidden rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/88 p-5 text-left shadow-[0_14px_34px_rgba(74,51,35,0.08)] transition hover:-translate-y-0.5 hover:border-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-feather-white)]"
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.iconBg} ${style.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge className="rounded-full bg-[var(--vintage-porcelain-mist)] px-2.5 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)]">
                        B2
                      </Badge>
                      <Badge className="rounded-full bg-[var(--vintage-porcelain-mist)] px-2.5 py-1 text-xs font-semibold text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)]">
                        <Clock3 className="mr-1 h-3.5 w-3.5" />
                        {time}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold leading-tight text-[var(--vintage-ink)]">
                    {subtopic.title}
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] px-2.5 py-1 text-xs font-medium text-[var(--vintage-muted-ink)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-sm leading-6 text-[var(--vintage-muted-ink)]">
                  Préparez vos idées, écoutez le support audio puis entrainez-vous à répondre.
                </p>

                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--vintage-muted-ink)]">
                    <MessageSquareQuote className="h-4 w-4" />
                    Oral guidé
                  </div>
                  <span className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--vintage-desert-rock)] px-4 text-sm font-semibold text-[var(--vintage-feather-white)] transition group-hover:bg-[#8f7763]">
                    <Play className="h-4 w-4" />
                    Commencer
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {topic.subtopics.length === 0 && (
        <TrainingSurface variant="dashed">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mic2 className="mb-4 h-12 w-12 text-[var(--vintage-desert-rock)]/45" />
            <h3 className="mb-2 font-semibold text-[var(--vintage-ink)]">Aucun sous-thème disponible</h3>
            <p className="max-w-md text-sm text-[var(--vintage-muted-ink)]">
              Ce thème ne contient pas encore de sous-thèmes.
            </p>
          </div>
        </TrainingSurface>
      )}
    </div>
  )
}
