import type { SVGProps } from "react"
import { cn } from "@/lib/utils"

type GoogleDriveIconProps = SVGProps<SVGSVGElement> & {
  className?: string
}

export function GoogleDriveIcon({ className, ...props }: GoogleDriveIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path d="M9 3.5h6l5.3 9.2-3 5.3H11L5.7 8.8 9 3.5Z" fill="#0F9D58" opacity="0.15" />
      <path d="M9 3.5h6l-3 5.3H6L9 3.5Z" fill="#0F9D58" />
      <path d="M15 3.5 20.3 12.7 17.3 18 12 8.8 15 3.5Z" fill="#4285F4" />
      <path d="M6 8.8h6l5.3 9.2h-6L6 8.8Z" fill="#F4B400" />
    </svg>
  )
}
