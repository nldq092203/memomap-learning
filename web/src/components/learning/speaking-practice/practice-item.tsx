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
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
        }
      case "question":
        return {
          title: "Practice Question",
          icon: MessageSquare,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
        }
      case "model":
        return {
          title: "Model Answer",
          icon: MessageSquare,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
        }
    }
  }

  const config = getItemConfig()
  const Icon = config.icon

  return (
    <Card className={cn("border-border/60 bg-gradient-to-br from-background to-muted/20", config.borderColor)}>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <h3 className="font-semibold">{config.title}</h3>
              {item.s && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  <span>{item.s} seconds to respond</span>
                </div>
              )}
            </div>
          </div>
          {itemType === "question" && item.s && (
            <Badge variant="secondary" className="shrink-0">
              {item.s}s
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="rounded-lg bg-muted/30 p-4 border border-border/40">
          <p className="text-base sm:text-lg leading-relaxed">{item.t}</p>
        </div>

        {/* Hint for questions */}
        {itemType === "question" && (
          <p className="text-sm text-muted-foreground italic">
            💡 Take your time to think about your answer, then speak when ready
          </p>
        )}

        {/* Hint for model answers */}
        {itemType === "model" && (
          <p className="text-sm text-muted-foreground italic">
            📝 Listen to this example answer to improve your speaking
          </p>
        )}
      </CardContent>
    </Card>
  )
}
