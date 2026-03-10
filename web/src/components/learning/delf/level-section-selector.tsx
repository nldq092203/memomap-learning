import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { BookOpen, Headphones, PenTool, Mic } from "lucide-react"

export const DELF_LEVELS: { id: DelfLevel; name: string; description: string }[] = [
  { id: "A1", name: "A1 Utilisateur Élémentaire", description: "Beginner level" },
  { id: "A2", name: "A2 Utilisateur Élémentaire", description: "Elementary level" },
  { id: "B1", name: "B1 Utilisateur Indépendant", description: "Intermediate level" },
  { id: "B2", name: "B2 Utilisateur Indépendant", description: "Upper intermediate level" },
  { id: "C1", name: "C1 Utilisateur Expérimenté", description: "Advanced level" },
  { id: "C2", name: "C2 Utilisateur Expérimenté", description: "Mastery level" },
]

export const DELF_SECTIONS: { id: DelfSection; name: string; icon: React.ReactNode; description: string }[] = [
  { id: "CO", name: "Compréhension de l'Oral", icon: <Headphones className="h-5 w-5" />, description: "Listening" },
  { id: "CE", name: "Compréhension des Écrits", icon: <BookOpen className="h-5 w-5" />, description: "Reading" },
  { id: "PE", name: "Production Écrite", icon: <PenTool className="h-5 w-5" />, description: "Writing" },
  { id: "PO", name: "Production Orale", icon: <Mic className="h-5 w-5" />, description: "Speaking" },
]

interface LevelSectionSelectorProps {
  onSelect: (level: DelfLevel, section: DelfSection) => void
  loading?: boolean
}

export function LevelSectionSelector({ onSelect, loading }: LevelSectionSelectorProps) {
  // We can either have a two-step selection or one combined view.
  // For simplicity, we'll ask for Level first, then Section.
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">DELF Practice</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Prepare for your DELF exam with realistic practice tests for all levels.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold px-2">1. Choose your Level</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DELF_LEVELS.map((level) => (
            <Card key={level.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col h-full justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{level.id}</h3>
                    <p className="text-sm text-muted-foreground">{level.name}</p>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    {DELF_SECTIONS.filter(s => s.id === "CO" || s.id === "CE").map((section) => (
                      <Button
                        key={section.id}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="w-full text-xs font-medium justify-start gap-2 group-hover:bg-primary/5"
                        onClick={() => onSelect(level.id, section.id)}
                      >
                        {section.icon}
                        {section.id}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
