"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LevelSectionSelector } from "@/components/learning/delf"
import { useGuest, GUEST_ALLOWED_LEVEL } from "@/lib/contexts/guest-context"
import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"
import { buildDelfListRoute } from "@/lib/utils/delf-routes"

export default function DelfPracticePage() {
  const router = useRouter()
  const { isGuest, setShowSyncModal } = useGuest()

  const handleLevelSectionSelect = (lvl: DelfLevel, sec: DelfSection) => {
    if (isGuest && lvl !== GUEST_ALLOWED_LEVEL) {
      setShowSyncModal(true)
      return
    }
    router.push(buildDelfListRoute(lvl, sec))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() => router.push("/learning/workspace")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à l&apos;espace d&apos;entrainement
        </Button>

        <LevelSectionSelector onSelect={handleLevelSectionSelect} />
      </div>
    </div>
  )
}
