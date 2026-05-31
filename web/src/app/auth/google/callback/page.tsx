"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import { useLogin } from "@/lib/hooks/use-auth"

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
  const searchParams = useSearchParams()
  const { login } = useLogin()
  const [error, setError] = useState<string | null>(null)

  // Capture the OAuth params from the *initial* render only. Stripping the
  // code from the URL below triggers Next.js to re-sync useSearchParams(),
  // so reading them live would re-run this effect with an empty `code`.
  const oauthParamsRef = useRef({
    code: searchParams.get("code"),
    oauthError: searchParams.get("error"),
    returnTo: getSafeReturnPath(searchParams.get("state")),
  })

  useEffect(() => {
    const { code, oauthError, returnTo } = oauthParamsRef.current

    if (oauthError) {
      setError("Google sign-in was cancelled or denied.")
      return
    }

    if (!code) {
      setError("Google sign-in did not return an authorization code.")
      return
    }

    window.history.replaceState(null, "", GOOGLE_REDIRECT_PATH)

    let cancelled = false

    void login(code, { redirectUri: getGoogleRedirectUri() })
      .then(() => {
        if (!cancelled) {
          router.replace(returnTo)
        }
      })
      .catch((error) => {
        console.error("Google redirect login failed:", error)
        if (!cancelled) {
          setError("Failed to finish Google sign-in. Please try again.")
        }
      })

    return () => {
      cancelled = true
    }
    // Runs once on mount: the exchange consumes a single-use code, and the
    // params are captured in a ref so URL changes never re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
