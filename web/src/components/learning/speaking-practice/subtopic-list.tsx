"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SpeakingTopicManifest } from "@/lib/types/api/speaking-practice"
import { TrainingChoiceCard, TrainingSectionHeader, TrainingSurface } from "@/components/learning/ui"
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
    accent: "text-emerald-700",
    iconBg: "bg-emerald-100",
    orb: "from-emerald-200/80 via-teal-100/70 to-transparent",
  },
  {
    icon: TrendingUp,
    accent: "text-teal-700",
    iconBg: "bg-teal-100",
    orb: "from-teal-200/80 via-cyan-100/70 to-transparent",
  },
  {
    icon: Globe2,
    accent: "text-sky-700",
    iconBg: "bg-sky-100",
    orb: "from-sky-200/80 via-indigo-100/70 to-transparent",
  },
  {
    icon: Leaf,
    accent: "text-lime-700",
    iconBg: "bg-lime-100",
    orb: "from-lime-200/80 via-emerald-100/70 to-transparent",
  },
  {
    icon: BookOpen,
    accent: "text-indigo-700",
    iconBg: "bg-indigo-100",
    orb: "from-indigo-200/80 via-slate-100/70 to-transparent",
  },
  {
    icon: Sparkles,
    accent: "text-amber-700",
    iconBg: "bg-amber-100",
    orb: "from-amber-200/80 via-orange-100/70 to-transparent",
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Thèmes
        </button>
        <span>/</span>
        <span className="truncate font-medium text-slate-700">{topic.title}</span>
      </div>

      <TrainingSectionHeader
        eyebrow="Bibliothèque de sous-thèmes"
        title={topic.title}
        description="Choisissez une carte pour lancer une pratique orale guidée avec audio, questions et réponse modèle."
        badge={
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {topic.subtopics.length} {topic.subtopics.length === 1 ? "sous-thème" : "sous-thèmes"}
          </Badge>
        }
        aside={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Mic2 className="h-7 w-7" />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topic.subtopics.map((subtopic, index) => {
          const style = SUBTOPIC_STYLES[index % SUBTOPIC_STYLES.length]
          const Icon = style.icon
          const tags = getTopicTags(subtopic.title)
          const time = getEstimatedTime(subtopic.title, index)

          return (
            <TrainingChoiceCard
              key={subtopic.id}
              onClick={() => onSelectSubtopic(subtopic.contentPath)}
              className="hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-100/70"
              contentClassName="min-h-[270px]"
              icon={
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-3xl", style.iconBg)}>
                  <Icon className={cn("h-7 w-7", style.accent)} />
                </div>
              }
              title={subtopic.title}
              meta={
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm hover:bg-white/90">
                    B2 Focus
                  </Badge>
                  <Badge className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm hover:bg-white/90">
                    <Clock3 className="mr-1 h-3.5 w-3.5" />
                    {time}
                  </Badge>
                </div>
              }
              footer={
                <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                  <MessageSquareQuote className="h-4 w-4" />
                  Expression orale guidée
                </div>
              }
              action={
                <Button
                  size="sm"
                  className="pointer-events-none rounded-full bg-emerald-100 text-emerald-700 transition-all group-hover:bg-teal-500 group-hover:text-white"
                >
                  <Play className="mr-1 h-4 w-4" />
                  Commencer
                </Button>
              }
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-90 transition-opacity group-hover:opacity-100",
                  style.orb
                )}
              />
              <div className="relative space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  Préparez vos idées, écoutez le support audio puis entrainez-vous à répondre de façon fluide et structurée.
                </p>
              </div>
            </TrainingChoiceCard>
          )
        })}
      </div>

      {topic.subtopics.length === 0 && (
        <TrainingSurface variant="dashed">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mic2 className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 font-semibold text-slate-950">Aucun sous-thème disponible</h3>
            <p className="max-w-md text-sm text-slate-500">
              Ce thème ne contient pas encore de sous-thèmes.
            </p>
          </div>
        </TrainingSurface>
      )}
    </div>
  )
}
