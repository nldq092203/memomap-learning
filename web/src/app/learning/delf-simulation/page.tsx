import { GraduationCap } from "lucide-react"

import { ExerciseHubPage } from "@/components/learning/exercise-hub/exercise-hub-page"

export default function DelfSimulationPage() {
  return (
    <ExerciseHubPage
      eyebrow="DELF Simulation"
      title="DELF Simulation"
      description="À venir."
      visualIcon={GraduationCap}
      actions={[]}
      emptyTitle="Next time"
      emptyDescription="La simulation complète sera ajoutée après."
    />
  )
}
