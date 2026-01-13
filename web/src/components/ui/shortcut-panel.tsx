import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Keyboard } from 'lucide-react'
import { useAllShortcuts } from './shortcut-display'

export const ShortcutPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { formatting, custom } = useAllShortcuts()

  const totalShortcuts = formatting.length + custom.length

  if (totalShortcuts === 0) return null

  return (
    <div className="relative">
      {/* Compact Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Keyboard className="h-3 w-3 mr-1" />
        Shortcuts ({totalShortcuts})
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 ml-1" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-1" />
        )}
      </Button>

      {/* Expanded Panel */}
      {isExpanded && (
        <Card className="absolute top-8 right-0 z-50 w-80 shadow-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formatting Shortcuts */}
            {formatting.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">Formatting</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatting.length} shortcut{formatting.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-1">
                  {formatting.map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50">
                      <span className="text-xs text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Action Shortcuts */}
            {custom.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">Actions</Badge>
                  <span className="text-xs text-muted-foreground">
                    {custom.length} shortcut{custom.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-1">
                  {custom.map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50">
                      <span className="text-xs text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  )
}
