"use client"

import { type ComponentType, type SVGProps } from "react"

export type DockAction = {
  label: string
  hint: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  onClick: () => void
}

export function BottomDock({ actions }: { actions: DockAction[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-2 sm:px-4">
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-3 rounded-2xl sm:rounded-3xl border border-border/60 bg-background/90 px-2 sm:px-4 py-2 sm:py-3 shadow-xl backdrop-blur max-w-[calc(100vw-1rem)]">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              title={`${action.label} (${action.hint})`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-primary/5 active:scale-95"
            >
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              {/* Hide text on mobile, show on sm+ */}
              <div className="hidden sm:block text-left">
                <p className="text-sm">{action.label}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

