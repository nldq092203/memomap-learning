import type { KeyboardEvent, ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TrainingSurface } from "./training-surface"

interface TrainingChoiceCardProps {
  icon?: ReactNode
  title: string
  description?: string
  eyebrow?: ReactNode
  meta?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  action?: ReactNode
  onClick?: () => void
  className?: string
  contentClassName?: string
  interactive?: boolean
}

export function TrainingChoiceCard({
  icon,
  title,
  description,
  eyebrow,
  meta,
  children,
  footer,
  action,
  onClick,
  className,
  contentClassName,
  interactive = true,
}: TrainingChoiceCardProps) {
  const isClickable = Boolean(onClick) && interactive

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick?.()
    }
  }

  return (
    <TrainingSurface
      className={cn(
        "group relative overflow-hidden transition-all",
        isClickable && "cursor-pointer hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg",
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={cn("relative flex h-full flex-col p-6", contentClassName)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon}
            <div className="min-w-0 space-y-2">
              {eyebrow}
              <h3 className="text-xl font-semibold leading-tight text-slate-950">{title}</h3>
              {description && <p className="text-sm leading-6 text-slate-500">{description}</p>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {meta}
            {isClickable && !action && <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />}
          </div>
        </div>

        {children && <div className="mt-5 flex-1">{children}</div>}

        {(footer || action) && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">{footer}</div>
            {action}
          </div>
        )}
      </div>
    </TrainingSurface>
  )
}
