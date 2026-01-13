import { memo } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

interface ResizeHandleProps {
  isResizing: boolean
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
}

/**
 * ResizeHandle renders the vertical draggable divider between the
 * dictation panel and the sidebar on desktop layouts.
 */
export const ResizeHandle = memo(function ResizeHandle({
  isResizing,
  onMouseDown,
}: ResizeHandleProps) {
  return (
    <div className="hidden md:flex items-stretch" aria-hidden="true">
      <div
        onMouseDown={onMouseDown}
        className={`w-1 cursor-col-resize rounded-full bg-border hover:bg-primary/60 transition-colors ${
          isResizing ? "bg-primary" : ""
        }`}
      />
    </div>
  )
})

