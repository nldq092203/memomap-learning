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
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  description?: string
}

const primaryNavItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/learning", 
    icon: Home,
    description: "Overview and progress"
  },
  { 
    label: "Review Hub", 
    href: "/learning/review-hub", 
    icon: Target,
    description: "Spaced repetition reviews"
  },
  { 
    label: "Vocabulary", 
    href: "/learning/vocab", 
    icon: BookOpen,
    description: "Browse and manage cards"
  },
  { 
    label: "Training", 
    href: "/learning/workspace", 
    icon: Layers,
    description: "Guided practice activities"
  },
  { 
    label: "Numbers", 
    href: "/learning/numbers-dictation", 
    icon: List,
    description: "Numbers Dictation practice"
  },
  { 
    label: "Transcribe", 
    href: "/learning/transcribe", 
    icon: Mic, 
    description: "Record and transcribe audio"
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
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export const LearningNav = ({ 
  showBackButton = false, 
  customBackAction,
  breadcrumbs 
}: LearningNavProps) => {
  const pathname = usePathname()
  const router = useRouter()

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
  const hidePrimaryNav = isSessionDetail || isNumbersDictation || isCoCePractice

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
                  {crumb.href ? (
                    <button
                      onClick={() => router.push(crumb.href!)}
                      className="hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-none"
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

        {/* Primary Navigation - Hidden on session detail pages or when
            a dedicated top-level nav already provides these links (e.g. Numbers Dictation). */}
        {!hidePrimaryNav && (
          <div className="flex items-center justify-between gap-4">
            <nav className="flex items-center gap-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-muted/50",
                      isActive 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground"
                    )}
                    title={item.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-x-0 -bottom-3 h-0.5 bg-primary" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Right controls: Secondary Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        "hover:bg-muted/50",
                        isActive 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Option B: Back + Breadcrumbs only. No extra session label row. */}
      </div>
    </div>
  )
}
