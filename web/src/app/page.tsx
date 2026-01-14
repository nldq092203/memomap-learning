"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { LoginButton } from "@/components/auth/login-button"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
  Mic,
  Target,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, error } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
        {/* Backend Status Alert */}
        {error && error.includes("Failed to fetch") && (
          <div className="mb-8 p-4 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="text-sm">
                <strong className="text-orange-800 dark:text-orange-200">Backend not available:</strong> Cannot connect
                to Flask server. Make sure your Flask backend is running on{" "}
                <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">http://127.0.0.1:5000</code>
              </div>
            </div>
          </div>
        )}

        <section className="animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
            {/* Left: hero copy */}
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                <span className="block">Welcome to</span>
                <span className="block text-primary">MemoMap</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Learn French with MemoMap, a tool that helps you learn language with multiple activities and AI assistant.
              </p>

              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    <p className="text-sm sm:text-base text-foreground">
                      Welcome back,{" "}
                      <span className="font-semibold">
                        {user?.name || "learner"}
                      </span>
                      !
                    </p>
                    <Link
                      href="/learning"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 font-medium"
                    >
                      Continue learning
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Sign in to start building your vocabulary, reviewing sessions, and tracking progress.
                    </p>
                    <LoginButton size="lg" />
                  </>
                )}
              </div>
            </div>

            {/* Right: feature overview card */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md border-none shadow-lg shadow-primary/5 bg-card/90 backdrop-blur">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Learning workspace
                  </div>
                  <CardTitle className="mt-3 text-lg">Everything you need in one place</CardTitle>
                  <CardDescription className="text-sm">
                    Jump back into your practice flow or explore a focused tool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <HomeRow
                      href="/learning/review-hub"
                      icon={Target}
                      label="Review Hub"
                      description="Run spaced‑repetition reviews for due vocabulary."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/vocab"
                      icon={BookOpen}
                      label="Vocabulary"
                      description="Browse, edit, and add cards to your deck."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/workspace"
                      icon={Layers}
                      label="Training"
                      description="Practice dictation and other guided activities."
                      active={false}
                    />
                    <HomeRow
                      href="/learning/transcribe"
                      icon={Mic}
                      label="Transcribe"
                      description="Record, upload, and turn audio into transcripts."
                      active={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

type HomeRowProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
  active?: boolean
}

function HomeRow({ href, icon: Icon, label, description, active }: HomeRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
        "hover:bg-muted/60 hover:border-primary/40",
        active && "border-primary bg-primary/5",
      )}
    >
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}
