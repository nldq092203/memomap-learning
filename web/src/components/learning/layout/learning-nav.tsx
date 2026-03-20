"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Home,
  Target,
  BookOpen,
  Layers,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Mic,
  List,
  Lock,
} from "lucide-react"
import { GuestModeBadge } from "@/components/auth/guest-mode-badge"
import { useGuest } from "@/lib/contexts/guest-context"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  description?: string
  /** Whether this item is accessible to guests. Defaults to false. */
  guestAllowed?: boolean
}

const primaryNavItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/learning", 
    icon: Home,
    description: "Overview and progress",
    guestAllowed: true,
  },
  { 
    label: "Review Hub", 
    href: "/learning/review-hub", 
    icon: Target,
    description: "Spaced repetition reviews",
  },
  { 
    label: "Vocabulary", 
    href: "/learning/vocab", 
    icon: BookOpen,
    description: "Browse and manage cards",
  },
  { 
    label: "Training", 
    href: "/learning/workspace", 
    icon: Layers,
    description: "Guided practice activities",
    guestAllowed: true,
  },
  { 
    label: "Numbers", 
    href: "/learning/numbers-dictation", 
    icon: List,
    description: "Numbers Dictation practice",
    guestAllowed: true,
  },
  { 
    label: "Transcribe", 
    href: "/learning/transcribe", 
    icon: Mic, 
    description: "Record and transcribe audio",
  },
]

const secondaryNavItems: NavItem[] = [
  {
    label: "Sync",
    href: "/learning/sync",
    icon: RefreshCw,
  },
]

interface LearningNavProps {
  showBackButton?: boolean
  customBackAction?: () => void
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>
}

export const LearningNav = ({ 
  showBackButton = false, 
  customBackAction,
  breadcrumbs 
}: LearningNavProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const { isGuest, setShowSyncModal } = useGuest()

  const handleBack = () => {
    if (customBackAction) {
      customBackAction()
    } else {
      router.back()
    }
  }

  const isSessionDetail = pathname.includes("/learning/session/")
  const isNumbersDictation = pathname.startsWith("/learning/numbers-dictation")
  const isCoCePractice = pathname.startsWith("/learning/coce-practice")
  const isDelfPractice = pathname.startsWith("/learning/delf-practice")
  const hidePrimaryNav = isSessionDetail || isNumbersDictation || isCoCePractice || isDelfPractice

  // Dynamic back label for better context (e.g., "Back to Dashboard")
  const backLabel = breadcrumbs && breadcrumbs.length > 0
    ? `Back to ${breadcrumbs[0].label}`
    : (pathname.includes("workspace") ? "Back to Training" : "Back")

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-3 sm:px-6 py-2 sm:py-3">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 flex-wrap">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-6 sm:h-7 gap-1 sm:gap-2 px-1.5 sm:px-2 text-xs sm:text-sm shrink-0"
              >
                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{backLabel}</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
            {/* On mobile, show only last 2 breadcrumbs with ellipsis */}
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              const showOnMobile = index === 0 || isLast || breadcrumbs.length <= 2
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-1 sm:gap-2",
                    !showOnMobile && "hidden sm:flex"
                  )}
                >
                  {index > 0 && <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />}
                  {/* Show ellipsis on mobile for middle items */}
                  {index === 1 && breadcrumbs.length > 2 && (
                    <span className="sm:hidden text-muted-foreground">...</span>
                  )}
                  {crumb.href || crumb.onClick ? (
                    <button
                      onClick={() => {
                        if (crumb.onClick) crumb.onClick()
                        else if (crumb.href) router.push(crumb.href)
                      }}
                      className="cursor-pointer hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-none"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-none">{crumb.label}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Primary Navigation */}
        {!hidePrimaryNav && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="-mx-3 flex items-center gap-1 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
              {primaryNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const isLocked = isGuest && !item.guestAllowed

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setShowSyncModal(true)
                      } else {
                        router.push(item.href)
                      }
                    }}
                    className={cn(
                      "relative shrink-0 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4",
                      isLocked
                        ? "opacity-40 cursor-not-allowed hover:opacity-50"
                        : "hover:bg-muted/50",
                      isActive && !isLocked
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground"
                    )}
                    title={isLocked ? "Connectez-vous pour débloquer" : item.description}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {isLocked && <Lock className="h-3 w-3 ml-0.5 hidden sm:inline" />}
                    {isActive && !isLocked && (
                      <div className="absolute inset-x-0 -bottom-3 h-0.5 bg-primary" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Right controls: Secondary Navigation + Guest Badge */}
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <GuestModeBadge />
              {/* Hide secondary nav (Sync) for guests */}
              {!isGuest && (
                <div className="flex items-center gap-1">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          "hover:bg-muted/50",
                          isActive 
                            ? "text-primary bg-primary/10" 
                            : "text-muted-foreground"
                        )}
                        aria-label={item.label}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden md:inline">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Option B: Back + Breadcrumbs only. No extra session label row. */}
      </div>
    </div>
  )
}
