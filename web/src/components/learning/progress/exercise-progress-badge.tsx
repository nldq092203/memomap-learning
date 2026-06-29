import { CheckCircle2, Circle, RotateCcw, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExerciseProgressStatus } from "@/lib/services/learning-progress-api"

const STATUS_META: Record<
  ExerciseProgressStatus,
  {
    label: string
    className: string
    icon: typeof Circle
  }
> = {
  not_started: {
    label: "À commencer",
    className:
      "bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-muted-ink)]",
    icon: Circle,
  },
  in_progress: {
    label: "En cours",
    className:
      "bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]",
    icon: Timer,
  },
  completed: {
    label: "Terminé",
    className:
      "bg-[var(--vintage-desert-rock)] text-[var(--vintage-feather-white)]",
    icon: CheckCircle2,
  },
  retry_suggested: {
    label: "À refaire",
    className:
      "bg-[var(--vintage-soft-sandstone)] text-[var(--vintage-ink)]",
    icon: RotateCcw,
  },
}

export function ExerciseProgressBadge({
  status,
  className,
}: {
  status?: ExerciseProgressStatus | null
  className?: string
}) {
  const meta = STATUS_META[status || "not_started"]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}

