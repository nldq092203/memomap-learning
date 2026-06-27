"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LevelSectionSelector } from "@/components/learning/delf"
import { useGuest, GUEST_ALLOWED_DELF_LEVELS } from "@/lib/contexts/guest-context"
import type { DelfLevel } from "@/lib/types/api/delf"
import { buildDelfLevelRoute } from "@/lib/utils/delf-routes"

export default function DelfPracticePage() {
  const router = useRouter()
  const { isGuest, setShowLoginPrompt } = useGuest()

  const handleLevelSelect = (lvl: DelfLevel) => {
    if (isGuest && !GUEST_ALLOWED_DELF_LEVELS.includes(lvl)) {
      setShowLoginPrompt(true)
      return
    }
    router.push(buildDelfLevelRoute(lvl))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à l&apos;espace d&apos;entrainement
        </Button>

        <LevelSectionSelector onSelect={handleLevelSelect} />
      </div>
    </div>
  )
}
