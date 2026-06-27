import { BookOpen, Headphones } from "lucide-react"
import { cn } from "@/lib/utils"

interface PracticeTypeSelectorProps {
  activeType: "co" | "ce" | null
  onSelectType: (type: "co" | "ce") => void
}

const PRACTICE_TYPES = [
  {
    id: "co" as const,
    label: "CO",
    description: "Compréhension orale",
    icon: Headphones,
  },
  {
    id: "ce" as const,
    label: "CE",
    description: "Compréhension écrite",
    icon: BookOpen,
  },
]

export function PracticeTypeSelector({ activeType, onSelectType }: PracticeTypeSelectorProps) {
  return (
    <div className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 p-2 shadow-[0_18px_42px_rgba(74,51,35,0.08)]">
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="tablist"
        aria-label="Mode d'exercice"
      >
        {PRACTICE_TYPES.map((type) => {
          const Icon = type.icon
          const isActive = activeType === type.id

          return (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectType(type.id)}
              className={cn(
                "flex items-center gap-3 rounded-[18px] px-4 py-3 text-left transition-all",
                isActive
                  ? "bg-[var(--vintage-desert-rock)] text-white shadow-sm"
                  : "bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-cream)] hover:text-[var(--vintage-ink)]"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
                  isActive ? "bg-white/20 text-white" : "bg-[var(--vintage-feather-white)] text-[var(--vintage-desert-rock)]"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{type.label}</p>
                <p className={cn("text-xs", isActive ? "text-white/80" : "text-[var(--vintage-muted-ink)]")}>
                  {type.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
