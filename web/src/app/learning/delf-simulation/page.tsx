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
      emptyTitle="Fonctionnalité à venir"
      emptyDescription="Cette section sera ajoutée dans les prochaines mises à jour."
    />
  )
}
