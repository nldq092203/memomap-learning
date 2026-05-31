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
  const exchangedCodeRef = useRef<string | null>(null)
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")
  const returnTo = getSafeReturnPath(searchParams.get("state"))

  useEffect(() => {
    if (oauthError) {
      setError("Google sign-in was cancelled or denied.")
      return
    }

    if (!code) {
      setError("Google sign-in did not return an authorization code.")
      return
    }

    if (exchangedCodeRef.current === code) {
      return
    }
    exchangedCodeRef.current = code

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
  }, [code, login, oauthError, returnTo, router])

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
