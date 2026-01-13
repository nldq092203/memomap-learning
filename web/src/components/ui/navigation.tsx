"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Target,
  BookOpen,
  Layers,
  Mic,
} from "lucide-react"
import { UserProfile } from "@/components/auth/user-profile"
import { LoginButton } from "@/components/auth/login-button"
import { useIsAuthenticated, useAuthLoading } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"

const primaryNavItems = [
  { label: "Dashboard", href: "/learning", icon: Home },
  { label: "Review Hub", href: "/learning/review-hub", icon: Target },
  { label: "Vocabulary", href: "/learning/vocab", icon: BookOpen },
  { label: "Training", href: "/learning/workspace", icon: Layers },
  { label: "Transcribe", href: "/learning/transcribe", icon: Mic },
] as const

export function Navigation() {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()
  const pathname = usePathname()
  const { lang, setLang } = useLearningLang()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-200">
      <div className="flex h-16 items-center px-4 sm:px-6 max-w-7xl mx-auto gap-4">
        {/* Left: logo */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              M
            </div>
            <span className="font-semibold text-sm hidden sm:inline">MemoMap</span>
          </Link>
        </div>

        {/* Center: main nav */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
            {primaryNavItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    "hover:bg-muted/50",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right: language + profile/auth */}
        <div className="flex items-center justify-end gap-3 flex-1">
          {isAuthenticated && (
            <>
              <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1">
                <span className="text-xs text-muted-foreground">Language:</span>
                <button
                  onClick={() => setLang("en")}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium transition",
                    lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("fr")}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium transition",
                    lang === "fr" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  FR
                </button>
              </div>
            </>
          )}

          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            <UserProfile />
          ) : (
            <LoginButton size="sm" />
          )}
        </div>
      </div>
    </header>
  )
}
