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
      emptyTitle="Fonctionnalité à venir"
      emptyDescription="Cette section sera ajoutée dans les prochaines mises à jour."
    />
  )
}
