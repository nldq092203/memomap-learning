import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DelfTestPaperResponse, DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { PlayCircle, Headphones, BookOpen, Clock, Loader2, ArrowLeft } from "lucide-react"

interface TestListProps {
  level: DelfLevel
  section: DelfSection
  tests: DelfTestPaperResponse[]
  loading: boolean
  onSelectTest: (testId: string, level: DelfLevel, variant: string, section: string) => void
  onBack: () => void
}

export function TestList({
  level,
  section,
  tests,
  loading,
  onSelectTest,
  onBack,
}: TestListProps) {
  const Icon = section === "CO" ? Headphones : BookOpen

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 h-8 px-2 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Levels
            </Button>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {level} - {section === "CO" ? "Compréhension de l'Oral" : "Compréhension des Écrits"}
          </h2>
          <p className="text-muted-foreground">Select a test paper to begin practice.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Icon className="mr-2 h-4 w-4" />
            {tests.length} {tests.length === 1 ? 'Test' : 'Tests'} Available
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[400px] flex-col items-center justify-center space-y-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <Card className="flex h-[400px] flex-col items-center justify-center space-y-4 p-8 text-center bg-muted/50 border-dashed">
          <div className="rounded-full bg-muted p-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No tests found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are currently no practice tests available for this level and section. Check back later!
            </p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Choose Another Level
          </Button>
        </Card>
      ) : (
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {tests.map((test) => (
              <Card
                key={test.id}
                className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">
                        Test {test.test_id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Variant: {test.variant}
                      </p>
                    </div>
                    {test.status === "draft" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Draft
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{test.exercise_count} Exercises</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full justify-between group/btn" 
                    variant="default"
                    onClick={() => onSelectTest(test.test_id, test.level, test.variant, test.section)}
                  >
                    Start Practice
                    <PlayCircle className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
