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
    <div className="rounded-[24px] border border-slate-200 bg-white/95 p-2 shadow-sm">
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
                  ? "bg-teal-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
                  isActive ? "bg-white/20 text-white" : "bg-white text-teal-600"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{type.label}</p>
                <p className={cn("text-xs", isActive ? "text-white/80" : "text-slate-500")}>
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
