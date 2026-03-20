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
      <div className={cn("relative flex h-full min-w-0 flex-col p-5 sm:p-6", contentClassName)}>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon}
            <div className="min-w-0 space-y-2">
              {eyebrow}
              <h3 className="text-balance break-words text-xl font-semibold leading-tight text-slate-950">{title}</h3>
              {description && <p className="break-words text-sm leading-6 text-slate-500">{description}</p>}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 self-start sm:max-w-[45%] sm:justify-end sm:self-auto">
            {meta}
            {isClickable && !action && <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />}
          </div>
        </div>

        {children && <div className="mt-5 flex-1">{children}</div>}

        {(footer || action) && (
          <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {footer && <div className="min-w-0 shrink-0">{footer}</div>}
            {action && <div className="min-w-0 w-full sm:w-auto sm:shrink-0">{action}</div>}
          </div>
        )}
      </div>
    </TrainingSurface>
  )
}
