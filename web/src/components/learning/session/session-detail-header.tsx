"use client"

import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface SessionDetailHeaderProps {
  session: {
    id: string
    title: string
    language: string
    duration: number
    createdAt: string
  }
}

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const hh = h.toString().padStart(2, "0")
  const mm = m.toString().padStart(2, "0")
  const ss = s.toString().padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

export function SessionDetailHeader({ session }: SessionDetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="rounded-full">
            {session.language.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(session.createdAt)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{formatDuration(session.duration)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
        </div>
      </div>
    </div>
  )
}
