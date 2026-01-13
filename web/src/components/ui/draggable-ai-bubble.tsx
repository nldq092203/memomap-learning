"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"

const BUBBLE_SIZE = 56
const BUBBLE_MARGIN = 16

interface DraggableAiBubbleProps {
  storageKey: string
  onClick: () => void
}

export function DraggableAiBubble({ storageKey, onClick }: DraggableAiBubbleProps) {
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{
    startMouseX: number
    startMouseY: number
    startX: number
    startY: number
  } | null>(null)
  const hasMovedRef = useRef(false)

  // Initialize bubble position (bottom-right) and restore from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const vw = window.innerWidth
    const vh = window.innerHeight
    let initial = {
      x: vw - BUBBLE_SIZE - BUBBLE_MARGIN,
      y: vh - BUBBLE_SIZE - BUBBLE_MARGIN,
    }
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as { x?: number; y?: number }
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          initial = { x: parsed.x, y: parsed.y }
        }
      }
    } catch {}
    const clamp = (x: number, y: number) => {
      const maxX = Math.max(vw - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)
      const maxY = Math.max(vh - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)
      return {
        x: Math.min(Math.max(BUBBLE_MARGIN, x), maxX),
        y: Math.min(Math.max(BUBBLE_MARGIN, y), maxY),
      }
    }
    setBubblePos(clamp(initial.x, initial.y))
  }, [storageKey])

  // Keep bubble inside viewport on resize
  useEffect(() => {
    if (!bubblePos || typeof window === "undefined") return
    const handleResize = () => {
      setBubblePos((prev) => {
        if (!prev) return prev
        const vw = window.innerWidth
        const vh = window.innerHeight
        const maxX = Math.max(vw - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)
        const maxY = Math.max(vh - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)
        return {
          x: Math.min(Math.max(BUBBLE_MARGIN, prev.x), maxX),
          y: Math.min(Math.max(BUBBLE_MARGIN, prev.y), maxY),
        }
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [bubblePos])

  // Drag behavior (mouse + touch)
  useEffect(() => {
    if (!isDragging || typeof window === "undefined") return

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragStateRef.current || !bubblePos) return
      const deltaX = clientX - dragStateRef.current.startMouseX
      const deltaY = clientY - dragStateRef.current.startMouseY

      if (!hasMovedRef.current && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        hasMovedRef.current = true
      }

      const vw = window.innerWidth
      const vh = window.innerHeight
      const maxX = Math.max(vw - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)
      const maxY = Math.max(vh - BUBBLE_SIZE - BUBBLE_MARGIN, BUBBLE_MARGIN)

      const nextX = Math.min(Math.max(BUBBLE_MARGIN, dragStateRef.current.startX + deltaX), maxX)
      const nextY = Math.min(Math.max(BUBBLE_MARGIN, dragStateRef.current.startY + deltaY), maxY)

      setBubblePos({ x: nextX, y: nextY })
    }

    const handleMouseMove = (event: MouseEvent) => handleMove(event.clientX, event.clientY)
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        event.preventDefault()
        handleMove(event.touches[0].clientX, event.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
      dragStateRef.current = null
      if (typeof window !== "undefined" && bubblePos) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(bubblePos))
        } catch {}
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleEnd)
    window.addEventListener("touchcancel", handleEnd)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleEnd)
      window.removeEventListener("touchcancel", handleEnd)
    }
  }, [isDragging, bubblePos, storageKey])

  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !bubblePos) return
    event.preventDefault()
    hasMovedRef.current = false
    setIsDragging(true)
    dragStateRef.current = {
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: bubblePos.x,
      startY: bubblePos.y,
    }
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (!bubblePos || event.touches.length !== 1) return
    event.preventDefault()
    hasMovedRef.current = false
    setIsDragging(true)
    const touch = event.touches[0]
    dragStateRef.current = {
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      startX: bubblePos.x,
      startY: bubblePos.y,
    }
  }

  const handleClick = () => {
    if (hasMovedRef.current) return
    onClick()
  }

  if (!bubblePos) return null

  return (
    <Button
      aria-label="Open AI Assistant"
      title="AI Assistant"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      size="icon"
      style={{
        position: "fixed",
        left: bubblePos.x,
        top: bubblePos.y,
        touchAction: "none",
      }}
      className="z-[60] h-12 w-12 cursor-grab rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-xl active:cursor-grabbing"
    >
      <Bot className="h-5 w-5" />
    </Button>
  )
}
