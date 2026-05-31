"use client"

import { useLogin } from "@/lib/hooks/use-auth"
import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { LogIn, Loader2, AlertCircle } from "lucide-react"
import { useState } from "react"

interface LoginButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
const GOOGLE_REDIRECT_PATH = "/auth/google/callback"

function getGoogleRedirectUri() {
  if (typeof window === "undefined") {
    return GOOGLE_REDIRECT_PATH
  }

  return `${window.location.origin}${GOOGLE_REDIRECT_PATH}`
}

function getOAuthReturnPath() {
  if (typeof window === "undefined") {
    return "/"
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function LoginButtonInner({
  variant,
  size,
  className,
  children,
}: LoginButtonProps) {
  const { login } = useLogin()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectUri = getGoogleRedirectUri()

  const googleLogin = useGoogleLogin({
    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    onSuccess: async (response) => {
      try {
        setError(null)
        await login(response.code)
      } catch (error) {
        console.error("Login failed:", error)
        setError("Failed to sign in. Please try again.")
      } finally {
        setIsSigningIn(false)
      }
    },
    onError: (error) => {
      console.error("Google login failed:", error)
      setIsSigningIn(false)
      setError("Google authentication failed. Please try again.")
    },
    onNonOAuthError: (error) => {
      console.error("Google login popup failed:", error)
      setIsSigningIn(false)

      if (error.type === "popup_failed_to_open") {
        setError("The Google sign-in popup was blocked. Allow popups for this site and try again.")
        return
      }

      if (error.type === "popup_closed") {
        setError("Google sign-in was closed before it finished.")
        return
      }

      setError("Google sign-in could not start. Please try again.")
    },
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: redirectUri,
    state: getOAuthReturnPath(),
  })

  const handleLogin = () => {
    try {
      setError(null)
      setIsSigningIn(true)
      googleLogin()
    } catch (error) {
      console.error("Google login could not start:", error)
      setIsSigningIn(false)
      setError("Google sign-in could not start. Please try again.")
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleLogin}
        disabled={isSigningIn}
        variant={variant}
        size={size}
        className={className}
      >
        {isSigningIn ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4 mr-2" />
            {children || "Sign in with Google"}
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function LoginButton({
  variant = "default",
  size = "default",
  className,
  children,
}: LoginButtonProps) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          disabled
          variant={variant}
          size={size}
          className={className}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          OAuth Not Configured
        </Button>
        <p className="text-xs text-muted-foreground">
          Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local
        </p>
      </div>
    )
  }

  return (
    <LoginButtonInner
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </LoginButtonInner>
  )
}
