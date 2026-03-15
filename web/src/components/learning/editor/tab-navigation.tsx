"use client"

import { useSessionTab } from "@/lib/contexts/session-tab-context"
import { cn } from "@/lib/utils"
import { BookOpen, Languages, MessageSquareText, NotebookPen } from "lucide-react"

interface TabNavigationProps {
  compact?: boolean
}

export function TabNavigation({ compact = false }: TabNavigationProps) {
  const { activeTab, setActiveTab } = useSessionTab()
  const tabs = [
    { id: "notes" as const, label: "Notes", icon: NotebookPen },
    { id: "vocab" as const, label: "Vocabulaire", icon: Languages },
    { id: "tags" as const, label: "Tags", icon: BookOpen },
    { id: "comments" as const, label: "Commentaires", icon: MessageSquareText },
  ]

  if (compact) {
    return (
      <div className="space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-emerald-200 bg-white text-slate-900 shadow-sm"
                  : "border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", activeTab === tab.id ? "text-emerald-500" : "text-emerald-400")} />
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-[11px] md:text-xs overflow-x-auto no-scrollbar pb-1 -mb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "px-3.5 py-1.5 rounded-full font-bold tracking-wide transition-all whitespace-nowrap active:scale-95",
            activeTab === tab.id 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
