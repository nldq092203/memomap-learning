import { memo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TabNavigation } from "@/components/learning/editor/tab-navigation"
import { TabContent } from "@/components/learning/editor/tab-content"
import { cn } from "@/lib/utils"

interface SidebarTabsProps {
  isDimmed: boolean
  flexBasis: string
}

/**
 * SidebarTabs renders the right-hand utility zone with tab navigation
 * (Entries, Notes, Vocab, Tags, Comments) and associated content.
 */
export const SidebarTabs = memo(function SidebarTabs({
  isDimmed,
  flexBasis,
}: SidebarTabsProps) {
  return (
    <div
      className={cn(
        "space-y-3 md:space-y-4 md:h-[calc(100vh-56px-64px-48px)] md:flex-shrink-0",
        isDimmed ? "hidden md:hidden" : "block md:block"
      )}
      style={{ flexBasis }}
    >
      <Card>
        <CardHeader className="pb-0 px-3 md:px-4 py-2 md:py-3">
          <TabNavigation />
        </CardHeader>
        <CardContent className="pt-2 md:pt-3 space-y-3 px-3 md:px-4 pb-3 md:pb-4">
          <TabContent />
        </CardContent>
      </Card>
    </div>
  )
})
