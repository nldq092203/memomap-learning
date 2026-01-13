import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CoCeExercise, CoCeLevel } from "@/lib/types/api/coce"
import { LEVEL_INFO } from "./level-selection"
import { ChevronLeft, Headphones, Play, Volume2, RefreshCw } from "lucide-react"

interface ExerciseListProps {
  level: CoCeLevel
  exercises: CoCeExercise[]
  loading: boolean
  onSelectExercise: (exerciseId: string) => void
  onBackToLevelSelection: () => void
}

export function ExerciseList({
  level,
  exercises,
  loading,
  onSelectExercise,
  onBackToLevelSelection,
}: ExerciseListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{LEVEL_INFO[level].name}</h1>
          <p className="text-sm text-muted-foreground">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Button variant="outline" onClick={onBackToLevelSelection}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Change Level
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="cursor-pointer border-border/60 transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => onSelectExercise(exercise.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span className="line-clamp-2">{exercise.name}</span>
                  <Headphones className="h-5 w-5 shrink-0 text-primary" />
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Volume2 className="h-3 w-3" />
                  {Math.floor(exercise.duration_seconds / 60)}:
                  {String(exercise.duration_seconds % 60).padStart(2, "0")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Start Exercise
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
