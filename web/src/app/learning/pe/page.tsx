import { PenLine } from "lucide-react"

import { ExerciseHubPage } from "@/components/learning/exercise-hub/exercise-hub-page"

export default function PePage() {
  return (
    <ExerciseHubPage
      eyebrow="Production écrite"
      title="Production écrite"
      description="Contenu à venir."
      visualIcon={PenLine}
      actions={[]}
      emptyTitle="Contenu à venir"
      emptyDescription="Les exercices PE seront ajoutés après."
    />
  )
}
