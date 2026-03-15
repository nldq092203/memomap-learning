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
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
        }
      case "question":
        return {
          title: "Question d'entrainement",
          icon: MessageSquare,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
        }
      case "model":
        return {
          title: "Réponse modèle",
          icon: MessageSquare,
          color: "text-teal-600",
          bgColor: "bg-teal-50",
          borderColor: "border-teal-200",
        }
    }
  }

  const config = getItemConfig()
  const Icon = config.icon

  return (
    <Card className={cn("rounded-[28px] border bg-white shadow-sm", config.borderColor)}>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-950">{config.title}</h3>
              {item.s && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{item.s} secondes pour répondre</span>
                </div>
              )}
            </div>
          </div>
          {itemType === "question" && item.s && (
            <Badge className="shrink-0 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              {item.s}s
            </Badge>
          )}
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-base leading-relaxed text-slate-800 sm:text-lg">{item.t}</p>
        </div>

        {itemType === "question" && (
          <p className="text-sm italic text-slate-500">
            Prenez un moment pour préparer votre réponse, puis parlez quand vous êtes prêt.
          </p>
        )}

        {itemType === "model" && (
          <p className="text-sm italic text-slate-500">
            Écoutez cette réponse exemple pour enrichir votre expression orale.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
