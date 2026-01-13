"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { LoginButton } from "./login-button";
import { Loader2 } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mx-auto">
              M
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Welcome to MemoMap</h1>
              <p className="text-muted-foreground">
                Sign in to access your learning workspace, notes, and tasks
              </p>
            </div>
            <LoginButton className="w-full" />
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}
