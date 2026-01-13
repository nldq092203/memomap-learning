import React from 'react'
import { FORMATTING_SHORTCUTS } from './shortcut-display'

export const EssentialShortcuts: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">Essential:</span>
      <div className="flex items-center gap-1">
        {FORMATTING_SHORTCUTS.slice(0, 3).map((shortcut, index) => (
          <React.Fragment key={shortcut.key}>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
              {shortcut.key}
            </kbd>
            {index < 2 && (
              <span className="text-muted-foreground/40">•</span>
            )}
          </React.Fragment>
        ))}
        <span className="text-muted-foreground/60 ml-1">+more</span>
      </div>
    </div>
  )
}
