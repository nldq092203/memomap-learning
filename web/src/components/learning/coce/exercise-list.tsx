import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CoCeExercise, CEFRLevel } from "@/lib/types/api/coce"
import { LEVEL_INFO } from "./level-selection"
import { ChevronLeft, Headphones, Play, Volume2, RefreshCw, Video, Sparkles } from "lucide-react"

interface ExerciseListProps {
  level: CEFRLevel
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
          {exercises.map((exercise) => {
            const isVideo = exercise.media_type === 'video'
            const thumbnailUrl = isVideo && exercise.media_id
              ? `https://img.youtube.com/vi/${exercise.media_id}/hqdefault.jpg`
              : null

            return (
              <Card
                key={exercise.id}
                className="group cursor-pointer overflow-hidden border-border/60 transition-all hover:border-primary/50 hover:shadow-lg"
                onClick={() => onSelectExercise(exercise.id)}
              >
                {/* Thumbnail Area */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={exercise.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    // Default Audio Thumbnail with Gradient
                    <div className="h-full w-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 flex flex-col items-center justify-center gap-3 transition-transform group-hover:scale-105">
                      <div className="h-12 w-12 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center shadow-sm">
                        <Headphones className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline" className="bg-background/50 backdrop-blur-sm gap-1.5 font-normal text-xs">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        AI Generated Audio
                      </Badge>
                    </div>
                  )}

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-full bg-white/90 p-4 shadow-lg scale-90 transition-transform group-hover:scale-100">
                      <Play className="h-8 w-8 text-primary fill-primary" />
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute right-2 top-2 flex gap-2">
                    {isVideo && (
                      <Badge className="bg-black/60 hover:bg-black/70 backdrop-blur-sm gap-1 border-none text-white" variant="secondary">
                        <Video className="h-3 w-3" />
                        Video
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span className="line-clamp-2 leading-tight">{exercise.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 text-xs pt-1">
                    <div className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      <span>
                        {Math.floor(exercise.duration_seconds / 60)}:
                        {String(exercise.duration_seconds % 60).padStart(2, "0")}
                      </span>
                    </div>
                    {isVideo && (
                       <div className="flex items-center gap-1 text-amber-600/80 dark:text-amber-400/80">
                         <Sparkles className="h-3 w-3" />
                         <span>AI Analysis</span>
                       </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <Button className="w-full" size="sm" variant={isVideo ? "default" : "secondary"}>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Start Exercise
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
