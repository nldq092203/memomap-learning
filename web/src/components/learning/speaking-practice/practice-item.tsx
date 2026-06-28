"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MessageSquare } from "lucide-react"
import type { SpeakingPracticeItem } from "@/lib/types/api/speaking-practice"
import { cn } from "@/lib/utils"

interface PracticeItemProps {
  item: SpeakingPracticeItem
  itemType: "intro" | "question" | "model"
}

export function PracticeItem({ item, itemType }: PracticeItemProps) {
  const getItemConfig = () => {
    switch (itemType) {
      case "intro":
        return {
          title: "Introduction",
          icon: MessageSquare,
          color: "text-[var(--vintage-desert-rock)]",
          bgColor: "bg-[var(--vintage-cream)]",
          borderColor: "border-[var(--vintage-soft-sandstone)]",
        }
      case "question":
        return {
          title: "Question d'entrainement",
          icon: MessageSquare,
          color: "text-[var(--vintage-desert-rock)]",
          bgColor: "bg-[var(--vintage-cream)]",
          borderColor: "border-[var(--vintage-soft-sandstone)]",
        }
      case "model":
        return {
          title: "Réponse modèle",
          icon: MessageSquare,
          color: "text-[var(--vintage-desert-rock)]",
          bgColor: "bg-[var(--vintage-cream)]",
          borderColor: "border-[var(--vintage-soft-sandstone)]",
        }
    }
  }

  const config = getItemConfig()
  const Icon = config.icon

  return (
    <Card className={cn("rounded-[24px] border bg-[var(--vintage-feather-white)]/92 shadow-[0_14px_34px_rgba(74,51,35,0.08)]", config.borderColor)}>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--vintage-ink)]">{config.title}</h3>
              {item.s && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--vintage-muted-ink)]">
                  <Clock className="h-3 w-3" />
                  <span>{item.s} secondes pour répondre</span>
                </div>
              )}
            </div>
          </div>
          {itemType === "question" && item.s && (
            <Badge className="shrink-0 rounded-full bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)] hover:bg-[var(--vintage-cream)]">
              {item.s}s
            </Badge>
          )}
        </div>

        <div className="rounded-[20px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)] p-4">
          <p className="text-base leading-relaxed text-[var(--vintage-ink)] sm:text-lg">{item.t}</p>
        </div>

        {itemType === "question" && (
          <p className="text-sm italic text-[var(--vintage-muted-ink)]">
            Prenez un moment pour préparer votre réponse, puis parlez quand vous êtes prêt.
          </p>
        )}

        {itemType === "model" && (
          <p className="text-sm italic text-[var(--vintage-muted-ink)]">
            Écoutez cette réponse exemple pour enrichir votre expression orale.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
