import type { ElementType, HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TrainingSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  children: ReactNode
  variant?: "default" | "soft" | "floating" | "dashed"
}

const surfaceVariants = {
  default: "rounded-[28px] border border-slate-200 bg-white shadow-sm",
  soft: "rounded-[30px] border border-slate-200 bg-white/95 shadow-sm backdrop-blur",
  floating: "rounded-[30px] border border-slate-200 bg-white/95 shadow-lg shadow-slate-200/60 backdrop-blur",
  dashed: "rounded-[28px] border border-dashed border-slate-300 bg-white shadow-sm",
}

export function TrainingSurface({
  as: Component = "div",
  children,
  className,
  variant = "default",
  ...props
}: TrainingSurfaceProps) {
  return (
    <Component className={cn(surfaceVariants[variant], className)} {...props}>
      {children}
    </Component>
  )
}
