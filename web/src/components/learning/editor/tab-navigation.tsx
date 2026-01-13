"use client"

import { useSessionTab } from "@/lib/contexts/session-tab-context"

export function TabNavigation() {
  const { activeTab, setActiveTab } = useSessionTab()
  const tabs = [
    { id: "notes" as const, label: "NOTES" },
    { id: "vocab" as const, label: "VOCAB" },
    { id: "tags" as const, label: "TAGS" },
    { id: "comments" as const, label: "COMMENTS" },
  ]

  return (
    <div className="flex items-center gap-2 text-xs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`px-3 py-1 rounded-full border transition ${
            activeTab === tab.id 
              ? "bg-primary/10 border-primary/30 text-primary" 
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
