import React from 'react'
import { useSettings } from '@/lib/contexts/settings-context'

interface ShortcutDisplayProps {
  shortcuts: Array<{
    key: string
    description: string
  }>
  className?: string
  variant?: 'default' | 'compact' | 'minimal' | 'categorized'
}

export const ShortcutDisplay: React.FC<ShortcutDisplayProps> = ({ 
  shortcuts, 
  className = "",
  variant = 'default'
}) => {
  const { formatting, custom } = useAllShortcuts()
  
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        {shortcuts.map((shortcut, index) => (
          <React.Fragment key={shortcut.key}>
            <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border border-border rounded">
              {shortcut.key}
            </kbd>
            {index < shortcuts.length - 1 && (
              <span className="text-muted-foreground/40">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <span className="hidden sm:inline">Shortcuts:</span>
        {shortcuts.map((shortcut, index) => (
          <React.Fragment key={shortcut.key}>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
              {shortcut.key}
            </kbd>
            {index < shortcuts.length - 1 && (
              <span className="text-muted-foreground/40">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (variant === 'categorized') {
    
    return (
      <div className={`space-y-2 text-xs text-muted-foreground ${className}`}>
        {formatting.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Formatting:</span>
            <div className="flex items-center gap-1.5 mt-1">
              {formatting.map((shortcut, index) => (
                <React.Fragment key={shortcut.key}>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                    {shortcut.key}
                  </kbd>
                  {index < formatting.length - 1 && (
                    <span className="text-muted-foreground/40">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        
        {custom.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Actions:</span>
            <div className="flex items-center gap-1.5 mt-1">
              {custom.map((shortcut, index) => (
                <React.Fragment key={shortcut.key}>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                    {shortcut.key}
                  </kbd>
                  {index < custom.length - 1 && (
                    <span className="text-muted-foreground/40">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span className="hidden sm:inline">Shortcuts:</span>
      {shortcuts.map((shortcut, index) => (
        <React.Fragment key={shortcut.key}>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded shadow-sm">
              {shortcut.key}
            </kbd>
            <span className="text-muted-foreground/60">{shortcut.description}</span>
          </div>
          {index < shortcuts.length - 1 && (
            <span className="text-muted-foreground/40">•</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// Predefined shortcut sets
export const FORMATTING_SHORTCUTS = [
  { key: "Cmd+B", description: "Bold" },
  { key: "Cmd+I", description: "Italic" },
  { key: "Cmd+U", description: "Underline" },
  { key: "Cmd+Shift+X", description: "Strikethrough" },
]

export const EDITOR_SHORTCUTS = [
  { key: "Cmd+Z", description: "Undo" },
  { key: "Cmd+Shift+Z", description: "Redo" },
]

// Hook to get all shortcuts including custom ones from settings
export const useAllShortcuts = () => {
  const { shortcuts: customShortcuts } = useSettings()
  
  const customShortcutsList = customShortcuts.map(shortcut => ({
    key: shortcut.keys,
    description: shortcut.label
  }))
  
  return {
    formatting: FORMATTING_SHORTCUTS,
    custom: customShortcutsList,
    all: [...FORMATTING_SHORTCUTS, ...customShortcutsList]
  }
}
