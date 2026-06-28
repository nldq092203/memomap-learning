"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import { useAuth, useLogin } from "@/lib/hooks/use-auth"

const GOOGLE_REDIRECT_PATH = "/auth/google/callback"

function getGoogleRedirectUri() {
  if (typeof window === "undefined") {
    return GOOGLE_REDIRECT_PATH
  }

  return `${window.location.origin}${GOOGLE_REDIRECT_PATH}`
}

function getSafeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/learning"
  }

  return value
}

function GoogleCallbackContent() {
  const router = useRouter()
  const { login } = useLogin()
  const { isAuthenticated, isLoading } = useAuth()
  const exchangeStartedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Read straight from the live URL. useSearchParams() can hydrate empty on
    // a statically-optimized page; window.location.search is always accurate
    // on the client. We intentionally do NOT strip the code from the URL here
    // — doing so makes any remount read an empty URL and show a false error.
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const oauthError = params.get("error")
    const returnTo = getSafeReturnPath(params.get("state"))

    if (isAuthenticated) {
      router.replace(returnTo)
      return
    }

    if (isLoading) {
      return
    }

    if (exchangeStartedRef.current) {
      return
    }
    exchangeStartedRef.current = true

    if (oauthError) {
      setError("Google sign-in was cancelled or denied.")
      return
    }

    if (!code) {
      setError("Google sign-in did not return an authorization code.")
      return
    }

    void login(code, { redirectUri: getGoogleRedirectUri() })
      .then(() => {
        router.replace(returnTo)
      })
      .catch((error) => {
        console.error("Google redirect login failed:", error)
        setError("Failed to finish Google sign-in. Please try again.")
      })
  }, [isAuthenticated, isLoading, login, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="text-base font-semibold text-foreground">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <h1 className="text-base font-semibold text-foreground">Finishing sign-in</h1>
          </>
        )}
      </div>
    </main>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  )
}
