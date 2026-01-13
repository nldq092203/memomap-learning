import { cn } from "@/lib/utils"
import { Headphones, BookOpen, CheckCircle2 } from "lucide-react"

interface PracticeTypeSelectorProps {
  activeType: "co" | "ce" | null
  onSelectType: (type: "co" | "ce") => void
}

export function PracticeTypeSelector({ activeType, onSelectType }: PracticeTypeSelectorProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground/90">Choose Practice Type</h2>
        <p className="text-sm text-muted-foreground">
          Select listening or reading comprehension practice
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelectType("co")}
          className={cn(
            "group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-300",
            activeType === "co"
              ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20"
              : "border-border/60 bg-card hover:border-primary/40 hover:shadow-md"
          )}
        >
          <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
            <Headphones className="h-16 w-16 text-primary" />
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                activeType === "co" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">CO Practice</h3>
                <p className="text-xs text-muted-foreground">Compréhension Orale</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Test your listening skills with audio-based comprehension questions
            </p>
            {activeType === "co" && (
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </div>
            )}
          </div>
        </button>

        <button
          onClick={() => onSelectType("ce")}
          className={cn(
            "group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-300",
            activeType === "ce"
              ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20"
              : "border-border/60 bg-card hover:border-primary/40 hover:shadow-md"
          )}
        >
          <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
            <BookOpen className="h-16 w-16 text-primary" />
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                activeType === "ce" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">CE Practice</h3>
                <p className="text-xs text-muted-foreground">Compréhension Écrite</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Practice reading comprehension with text-based questions
            </p>
            {activeType === "ce" && (
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
