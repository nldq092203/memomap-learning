import { BookOpen, Headphones, ListChecks } from "lucide-react"

import { ExerciseHubPage } from "@/components/learning/exercise-hub/exercise-hub-page"

export default function CoPage() {
  return (
    <ExerciseHubPage
      eyebrow="Compréhension orale"
      title="Écouter"
      description="Nombres, audio CO et DELF CO."
      visualIcon={Headphones}
      actions={[
        {
          title: "Comprendre les nombres",
          description: "Téléphones, prix, dates, horaires.",
          href: "/learning/numbers-dictation",
          icon: ListChecks,
          label: "Nombres",
        },
        {
          title: "Audio CO",
          description: "Questions de compréhension orale uniquement.",
          href: "/learning/coce-practice?section=CO",
          icon: Headphones,
          label: "Audio",
        },
        {
          title: "DELF CO",
          description: "Épreuves d'écoute DELF.",
          href: "/learning/delf-practice?section=CO",
          icon: BookOpen,
          label: "DELF",
        },
      ]}
    />
  )
}
