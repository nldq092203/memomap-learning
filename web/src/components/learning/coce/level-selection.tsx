import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CoCeLevel } from "@/lib/types/api/coce"
import { cn } from "@/lib/utils"
import { BookOpen } from "lucide-react"

const LEVEL_INFO: Record<CoCeLevel, { name: string; description: string; color: string }> = {
  B1: {
    name: "B1 - Intermediate",
    description: "Independent user, can understand main points of clear standard input",
    color: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50",
  },
  B2: {
    name: "B2 - Upper Intermediate",
    description: "Can understand complex texts and interact with native speakers",
    color: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50",
  },
  C1: {
    name: "C1 - Advanced",
    description: "Can express ideas fluently and use language flexibly",
    color: "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50",
  },
  C2: {
    name: "C2 - Proficiency",
    description: "Can understand virtually everything and express themselves precisely",
    color: "bg-red-500/10 border-red-500/30 hover:border-red-500/50",
  },
}

interface LevelSelectionProps {
  onSelectLevel: (level: CoCeLevel) => void
}

export function LevelSelection({ onSelectLevel }: LevelSelectionProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <BookOpen className="h-6 w-6 text-primary" />
            CO/CE Practice
          </CardTitle>
          <p className="text-sm text-muted-foreground md:text-base">
            Practice French listening (Compréhension Orale) and reading (Compréhension Écrite)
            comprehension with authentic audio exercises.
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Select Your Level</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(LEVEL_INFO) as CoCeLevel[]).map((lvl) => {
            const info = LEVEL_INFO[lvl]
            return (
              <Card
                key={lvl}
                className={cn(
                  "cursor-pointer border-2 transition-all hover:shadow-md",
                  info.color
                )}
                onClick={() => onSelectLevel(lvl)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{info.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">
                    Select {lvl}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { LEVEL_INFO }
