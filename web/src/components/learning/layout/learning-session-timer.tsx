"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { useLearningTimeSession } from "@/lib/contexts/learning-time-session-context"
import { getNextFloatingWindowZIndex } from "@/lib/utils/z-index-manager"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const mm = m.toString().padStart(2, "0")
  const ss = s.toString().padStart(2, "0")
  return `${mm}:${ss}`
}

export function LearningSessionTimer() {
  const {
    isActive,
    isPaused,
    name,
    elapsedSeconds,
    plannedSeconds,
    pauseSession,
    resumeSession,
    stopSession,
    cancelSession,
  } = useLearningTimeSession()

  const [mounted, setMounted] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [position, setPosition] = useState({ x: 24, y: 72 })
  const [isDragging, setIsDragging] = useState(false)
  const [zIndex, setZIndex] = useState(() => getNextFloatingWindowZIndex())

  const positionRef = useRef(position)
  const dragStateRef = useRef<{
    startClientX: number
    startClientY: number
    startX: number
    startY: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem("learning-timer-position")
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: number; y?: number } | null
        if (parsed) {
          setPosition({
            x: typeof parsed.x === "number" ? parsed.x : 24,
            y: typeof parsed.y === "number" ? parsed.y : 72,
          })
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const persistPosition = () => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        "learning-timer-position",
        JSON.stringify(positionRef.current),
      )
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return

      const deltaX = event.clientX - dragStateRef.current.startClientX
      const deltaY = event.clientY - dragStateRef.current.startClientY

      const newX = Math.max(
        0,
        Math.min(
          window.innerWidth - (isExpanded ? 180 : 80),
          dragStateRef.current.startX + deltaX,
        ),
      )
      const newY = Math.max(
        0,
        Math.min(
          window.innerHeight - (isExpanded ? 180 : 80),
          dragStateRef.current.startY + deltaY,
        ),
      )

      setPosition({ x: newX, y: newY })
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      dragStateRef.current = null
      if (typeof document !== "undefined") {
        document.body.style.userSelect = ""
      }
      persistPosition()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [isDragging, isExpanded])

  useEffect(() => {
    if (!isActive || !isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    const timer = setTimeout(() => {
      if (typeof document !== "undefined") {
        document.addEventListener("mousedown", handleClickOutside)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (typeof document !== "undefined") {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isActive, isExpanded])

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()

    setZIndex(getNextFloatingWindowZIndex())
    setIsDragging(true)
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none"
    }

    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: positionRef.current.x,
      startY: positionRef.current.y,
    }
  }

  const displaySeconds = plannedSeconds
    ? Math.max(plannedSeconds - elapsedSeconds, 0)
    : elapsedSeconds

  const progress = useMemo(() => {
    const maxSeconds = plannedSeconds && plannedSeconds > 0 ? plannedSeconds : 60 * 60
    return Math.min((elapsedSeconds / maxSeconds) * 100, 100)
  }, [elapsedSeconds, plannedSeconds])

  if (!isActive) {
    return null
  }

  if (!mounted) return null

  const size = isExpanded ? 180 : 80
  const circleSize = isExpanded ? 160 : 70
  const strokeWidth = isExpanded ? 6 : 5
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        zIndex,
      }}
      className="pointer-events-auto"
    >
      <div
        className={cn(
          "relative h-full w-full cursor-grab rounded-full bg-background/95",
          "backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          "transition-all duration-300",
          isDragging && "cursor-grabbing",
        )}
        onPointerDown={handlePointerDown}
        onClick={() => !isDragging && !isExpanded && setIsExpanded(true)}
      >
        <svg
          className="absolute inset-0 -rotate-90 transition-all duration-300"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-300"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          {isExpanded ? (
            <div className="flex flex-col items-center justify-center gap-2 p-4">
              <div className="mb-1 text-center space-y-1">
                <p className="tabular-nums text-2xl font-bold text-foreground">
                  {formatElapsed(displaySeconds)}
                </p>
                <p
                  className="mx-auto max-w-[150px] break-words text-[10px] leading-snug text-muted-foreground"
                  title={name || undefined}
                >
                  {name || "Learning session"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full bg-transparent px-2 text-[10px]"
                  disabled={isStopping}
                  onClick={event => {
                    event.stopPropagation()
                    cancelSession()
                  }}
                  onPointerDown={event => event.stopPropagation()}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full bg-transparent px-2 text-[10px]"
                  disabled={isStopping}
                  onClick={event => {
                    event.stopPropagation()
                    if (isPaused) {
                      resumeSession()
                    } else {
                      pauseSession()
                    }
                  }}
                  onPointerDown={event => event.stopPropagation()}
                >
                  {isPaused ? "Resume" : "Stop"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full px-2 text-[10px]"
                  disabled={isStopping}
                  onClick={async event => {
                    event.stopPropagation()
                    if (isStopping) return
                    setIsStopping(true)
                    try {
                      await stopSession()
                    } catch {
                      // errors are already handled in context
                    }
                  }}
                  onPointerDown={event => event.stopPropagation()}
                >
                  {isStopping && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {isStopping ? "Saving..." : "Stop & Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="tabular-nums text-sm font-bold text-foreground">
                {formatElapsed(displaySeconds)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
