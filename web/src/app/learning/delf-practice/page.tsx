"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LevelSectionSelector } from "@/components/learning/delf"
import { useGuest, GUEST_ALLOWED_DELF_LEVELS } from "@/lib/contexts/guest-context"
import type { DelfLevel } from "@/lib/types/api/delf"
import { buildDelfLevelRoute, isDelfSection } from "@/lib/utils/delf-routes"

export default function DelfPracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isGuest, setShowLoginPrompt } = useGuest()
  const sectionRaw = searchParams.get("section")?.toUpperCase()
  const preferredSection = sectionRaw && isDelfSection(sectionRaw) ? sectionRaw : null

  const handleLevelSelect = (lvl: DelfLevel) => {
    if (isGuest && !GUEST_ALLOWED_DELF_LEVELS.includes(lvl)) {
      setShowLoginPrompt(true)
      return
    }
    const suffix = preferredSection ? `?section=${preferredSection}` : ""
    router.push(`${buildDelfLevelRoute(lvl)}${suffix}`)
  }

  return (
    <div
      className="min-h-screen bg-[#f5eee5]"
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(245,238,229,0.94), rgba(245,238,229,0.98)), url('/UI/map.webp')",
        backgroundPosition: "center top",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] hover:text-[var(--vintage-ink)]"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>

        <LevelSectionSelector onSelect={handleLevelSelect} preferredSection={preferredSection} />
      </div>
    </div>
  )
}
