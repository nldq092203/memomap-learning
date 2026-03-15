import { memo } from "react"
import { TabNavigation } from "@/components/learning/editor/tab-navigation"
import { TabContent } from "@/components/learning/editor/tab-content"
import { cn } from "@/lib/utils"

interface SidebarTabsProps {
  isDimmed: boolean
  flexBasis: string
  compact?: boolean
  desktopOnly?: boolean
}

/**
 * SidebarTabs renders the right-hand utility zone with tab navigation
 * (Entries, Notes, Vocab, Tags, Comments) and associated content.
 */
export const SidebarTabs = memo(function SidebarTabs({
  isDimmed,
  flexBasis,
  compact = false,
  desktopOnly = false,
}: SidebarTabsProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        compact
          ? "space-y-0"
          : "space-y-4 md:h-[calc(100vh-56px-64px-48px)] md:flex-shrink-0 md:space-y-6",
        isDimmed ? "hidden md:hidden" : "block md:block",
        desktopOnly && "hidden xl:flex"
      )}
      style={{ flexBasis }}
    >
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden transition-all",
        compact
          ? "rounded-[20px] border border-slate-200/80 bg-white"
          : "rounded-3xl border border-black/[0.04] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      )}>
        <div className={cn(
          "border-b border-black/[0.04] bg-transparent",
          compact ? "px-4 py-3" : "px-5 py-4 md:px-6 md:py-5"
        )}>
          <TabNavigation compact={compact} />
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto bg-transparent",
          compact ? "p-4" : "p-5 md:p-6"
        )}>
          <TabContent />
        </div>
      </div>
    </div>
  )
})
