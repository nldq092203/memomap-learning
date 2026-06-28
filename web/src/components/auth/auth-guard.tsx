"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { LoginButton } from "./login-button";
import { BookOpen, Loader2, LockKeyhole } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5eee5]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--vintage-desert-rock)]" />
          <p className="text-[var(--vintage-muted-ink)]">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  // Show fallback or login prompt if not authenticated
  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f5eee5] px-4 py-8"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(245,238,229,0.92), rgba(245,238,229,0.98)), url('/UI/map.png')",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto w-full max-w-lg rounded-[30px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/92 p-7 text-center shadow-[0_22px_60px_rgba(74,51,35,0.14)] backdrop-blur">
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--vintage-porcelain-mist)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-desert-rock)]">
                <BookOpen className="h-3.5 w-3.5" />
                Accès membre
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--vintage-ink)]">Connectez-vous</h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[var(--vintage-muted-ink)]">
                Cette section est liée à votre progression. Connectez-vous pour l&apos;ouvrir et retrouver vos données.
              </p>
            </div>
            <LoginButton className="h-11 w-full rounded-full bg-[var(--vintage-desert-rock)] text-[var(--vintage-feather-white)] hover:bg-[#8f7763]">
              Se connecter avec Google
            </LoginButton>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}
