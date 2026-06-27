import { BookOpen, Headphones } from "lucide-react"

import { ExerciseHubPage } from "@/components/learning/exercise-hub/exercise-hub-page"

export default function CePage() {
  return (
    <ExerciseHubPage
      eyebrow="Compréhension écrite"
      title="Lire"
      description="Audio CE et DELF CE."
      visualIcon={BookOpen}
      actions={[
        {
          title: "Audio CE",
          description: "Questions de compréhension écrite uniquement.",
          href: "/learning/coce-practice?section=CE",
          icon: Headphones,
          label: "Audio",
        },
        {
          title: "DELF CE",
          description: "Épreuves de lecture DELF.",
          href: "/learning/delf-practice/A2?section=CE",
          icon: BookOpen,
          label: "DELF",
        },
      ]}
    />
  )
}
