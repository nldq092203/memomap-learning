"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { useGuest } from "@/lib/contexts/guest-context"
import { LoginButton } from "@/components/auth/login-button"
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Layers,
  LineChart,
  Lock,
  Mic,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const featureCards = [
  {
    href: "/learning/review-hub",
    icon: Target,
    label: "Révisions",
    description: "Pratiquez ce que vous avez appris aujourd'hui.",
    accent: "bg-blue-50",
    iconClassName: "bg-blue-100/80 text-blue-600",
    guestAllowed: false,
  },
  {
    href: "/learning/vocab",
    icon: BookOpen,
    label: "Vocabulaire",
    description: "Gérez et révisez votre liste de mots.",
    accent: "bg-emerald-50",
    iconClassName: "bg-emerald-100/80 text-emerald-600",
    guestAllowed: false,
  },
  {
    href: "/learning/workspace",
    icon: Layers,
    label: "Entraînement",
    description: "Exercices quotidiens de langue et dictée.",
    accent: "bg-amber-50",
    iconClassName: "bg-amber-100/80 text-amber-600",
    guestAllowed: true,
  },
  {
    href: "/learning/transcribe",
    icon: Mic,
    label: "Transcrire",
    description: "Convertissez la voix en texte et retravaillez-la.",
    accent: "bg-violet-50",
    iconClassName: "bg-violet-100/80 text-violet-600",
    guestAllowed: false,
  },
] as const

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const { isGuest } = useGuest()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/10">
        <p className="text-sm text-muted-foreground">Préparation de votre espace…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="space-y-8">
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl md:text-7xl">
              MemoMap
            </h1>

            <p className="max-w-3xl text-2xl font-medium leading-tight text-slate-800 sm:text-3xl md:text-4xl">
              Votre espace unifié pour progresser en français, chaque jour.
            </p>

            {isAuthenticated ? (
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link href="/learning">
                  Continuer l&apos;apprentissage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LoginButton size="lg" className="h-12 rounded-full px-6 text-base">
                  Login
                </LoginButton>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-teal-200 px-6 text-base text-teal-700 hover:bg-teal-50 hover:border-teal-300"
                >
                  <Link href="/learning">
                    Essayer en mode invité
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <Card className="overflow-hidden border-border/70 bg-white py-0 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.3)]">
            <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Accueil
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Espace d&apos;apprentissage
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LineChart className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                {featureCards.map(item => (
                  <HomeRow
                    key={item.href}
                    {...item}
                    locked={isGuest && !item.guestAllowed}
                    onNavigate={(target) => router.push(target)}
                  />
                ))}
              </div>

              <div className="mt-5">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-dashed border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                >
                  <Link href={isGuest ? "/learning/workspace" : "/learning"}>
                    {isGuest ? "Accéder à l'entraînement invité" : "Explorer toutes les fonctionnalités"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

type HomeRowProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
  accent: string
  iconClassName: string
  guestAllowed?: boolean
  locked?: boolean
  onNavigate?: (href: string) => void
}

function HomeRow({
  href,
  icon: Icon,
  label,
  description,
  accent,
  iconClassName,
  locked = false,
  onNavigate,
}: HomeRowProps) {
  return (
    <button
      type="button"
      disabled={locked}
      aria-disabled={locked}
      onClick={() => {
        onNavigate?.(href)
      }}
      className={cn(
        "group block w-full rounded-[1.75rem] border border-slate-200/80 bg-white p-2 text-left shadow-sm transition-all duration-200",
        locked
          ? "cursor-not-allowed opacity-40"
          : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className={cn("rounded-[1.2rem] p-0", accent)}>
        <div className="flex items-center gap-4 rounded-[1.15rem] border border-white/80 bg-white/90 px-4 py-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              iconClassName,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
              {label}
              {locked && <Lock className="h-4 w-4 text-slate-400" />}
            </p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-300 transition-colors",
              locked
                ? "border-slate-200/70 text-slate-300"
                : "group-hover:border-slate-300 group-hover:text-slate-600",
            )}
          >
            {locked ? <Lock className="h-4 w-4" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </div>
    </button>
  )
}
