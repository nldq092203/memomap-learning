import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { TrainingSurface } from "./training-surface"

interface TrainingSectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  badge?: ReactNode
  aside?: ReactNode
  className?: string
  titleClassName?: string
}

export function TrainingSectionHeader({
  eyebrow,
  title,
  description,
  badge,
  aside,
  className,
  titleClassName,
}: TrainingSectionHeaderProps) {
  return (
    <TrainingSurface className={cn("p-6", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={cn("min-w-0 text-balance break-words text-3xl font-bold tracking-tight text-slate-950 md:text-4xl", titleClassName)}>
              {title}
            </h1>
            {badge}
          </div>
          {description && <p className="max-w-2xl break-words text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {aside && <div className="self-start md:self-auto">{aside}</div>}
      </div>
    </TrainingSurface>
  )
}
