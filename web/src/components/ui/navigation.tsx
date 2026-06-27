"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Menu,
  MessageSquare,
  User,
  X,
  Lock,
} from "lucide-react"
import { UserProfile } from "@/components/auth/user-profile"
import { LoginButton } from "@/components/auth/login-button"
import { LogoutButton } from "@/components/auth/logout-button"
import { SupportProjectTrigger } from "@/components/auth/support-project-trigger"
import { useIsAuthenticated, useAuthLoading } from "@/lib/hooks/use-auth"
import { useGuest } from "@/lib/contexts/guest-context"
import { cn } from "@/lib/utils"

const primaryNavItems = [
  { label: "Accueil", href: "/", icon: Home, guestAllowed: true },
  { label: "Communauté", href: "/learning/community", icon: MessageSquare, guestAllowed: false },
  { label: "Vocabulaire", href: "/learning/review-hub", icon: BookOpen, guestAllowed: false },
  { label: "Profil", href: "/learning/profile", icon: User, guestAllowed: false },
] as const

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/learning"
  }

  if (href === "/learning/review-hub") {
    return pathname === href || pathname === "/learning/vocab"
  }

  return pathname === href
}

export function Navigation() {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()
  const pathname = usePathname()
  const { isGuest, setShowLoginPrompt } = useGuest()
  
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsReviewOpen(true)
    const handleClose = () => setIsReviewOpen(false)

    window.addEventListener("learning-review-open", handleOpen)
    window.addEventListener("learning-review-close", handleClose)

    return () => {
      window.removeEventListener("learning-review-open", handleOpen)
      window.removeEventListener("learning-review-close", handleClose)
    }
  }, [])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("memomap_sidebar_collapsed")
      if (raw === "1") setIsCollapsed(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "memomap_sidebar_collapsed",
        isCollapsed ? "1" : "0",
      )
    } catch {}
  }, [isCollapsed])

  if (isReviewOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--vintage-feather-white)]/85 lg:hidden">
        <Link href="/" className="flex items-center gap-3">
          <div>
            <p className="text-lg font-semibold italic leading-none text-[var(--vintage-ink)]">Paris</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--vintage-desert-rock)]">Journey</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/70 text-[var(--vintage-ink)] shadow-sm"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-slate-950/30 transition-opacity lg:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Spacer to reserve sidebar width in the flex layout */}
      <div
        className={cn(
          "hidden lg:block lg:shrink-0",
          isCollapsed ? "lg:w-24" : "lg:w-72",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[84vw] max-w-[320px] flex-col border-r border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] shadow-2xl transition-transform duration-300 lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-24" : "lg:w-72",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--vintage-soft-sandstone)] px-4 py-5 lg:px-5">
          <Link
            href="/"
            className={cn(
              "flex items-center overflow-hidden",
              isCollapsed && "lg:justify-center",
            )}
          >
            <div className={cn("min-w-0", isCollapsed && "lg:hidden")}>
              <p className="text-2xl font-semibold italic leading-none text-[var(--vintage-ink)]">Paris</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--vintage-desert-rock)]">
                Journey
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--vintage-soft-sandstone)] text-[var(--vintage-desert-rock)] lg:hidden"
              aria-label="Fermer la navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(prev => !prev)}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[var(--vintage-soft-sandstone)] text-[var(--vintage-desert-rock)] transition hover:bg-[var(--vintage-porcelain-mist)] hover:text-[var(--vintage-ink)] lg:flex"
              aria-label={isCollapsed ? "Ouvrir la barre latérale" : "Réduire la barre latérale"}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className={cn("mb-4 px-2", isCollapsed && "lg:hidden")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--vintage-desert-rock)]">
              Navigation
            </p>
          </div>

          <nav className="space-y-1.5">
            {primaryNavItems.map(({ label, href, icon: Icon, guestAllowed }) => {
              const isActive = isNavItemActive(pathname, href)
              const isLocked = isGuest && !guestAllowed

              if (isLocked) {
                return (
                  <button
                    key={href}
                    onClick={() => setShowLoginPrompt(true)}
                    className={cn(
                      "w-full group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all",
                      "opacity-40 cursor-not-allowed hover:opacity-50",
                      isCollapsed && "lg:justify-center lg:px-2",
                    )}
                    title="Connectez-vous pour débloquer"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                        "bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-desert-rock)] group-hover:text-[var(--vintage-ink)]",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className={cn("min-w-0 flex-1 text-left", isCollapsed && "lg:hidden")}>
                      <p className="font-medium flex items-center gap-2 text-[var(--vintage-desert-rock)]">
                        {label}
                        <Lock className="h-3 w-3" />
                      </p>
                    </div>

                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--vintage-desert-rock)]/70",
                        isCollapsed && "lg:hidden",
                      )}
                    />
                  </button>
                )
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all",
                    isActive
                      ? "bg-[var(--vintage-cream)] text-[var(--vintage-ink)]"
                      : "text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-porcelain-mist)] hover:text-[var(--vintage-ink)]",
                    isCollapsed && "lg:justify-center lg:px-2",
                  )}
                  title={label}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      isActive
                        ? "bg-[var(--vintage-desert-rock)] text-white"
                        : "bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-desert-rock)] group-hover:text-[var(--vintage-ink)]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className={cn("min-w-0 flex-1 text-left", isCollapsed && "lg:hidden")}>
                    <p className="font-medium">{label}</p>
                  </div>

                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-[var(--vintage-desert-rock)]/70",
                      isCollapsed && "lg:hidden",
                    )}
                  />
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-[var(--vintage-soft-sandstone)] p-3">
          <div className={cn(isCollapsed && "lg:hidden")}>
            <SupportProjectTrigger variant="nav" />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--vintage-porcelain-mist)] px-3 py-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--vintage-cream)]" />
              <div className={cn("space-y-2", isCollapsed && "lg:hidden")}>
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--vintage-cream)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--vintage-cream)]" />
              </div>
            </div>
          ) : isAuthenticated ? (
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-2xl border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-porcelain-mist)]/70 p-3",
                isCollapsed && "lg:px-2",
              )}
            >
              <UserProfile
                showLogout={false}
                className={cn("min-w-0", isCollapsed && "lg:justify-center")}
              />
              <div className={cn("mt-3", isCollapsed && "lg:hidden")}>
                <LogoutButton variant="ghost" className="w-full justify-start rounded-xl">
                  Se déconnecter
                </LogoutButton>
              </div>
            </div>
          ) : (
            <div className={cn(isCollapsed && "lg:hidden")}>
              <LoginButton className="w-full justify-center rounded-xl" />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
