"use client";

import { AuthGuard } from "./auth-guard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Higher-order component to protect routes that require authentication
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  return (
    <AuthGuard fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

/**
 * HOC for protecting pages
 */
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function AuthenticatedComponent(props: T) {
    return (
      <ProtectedRoute fallback={fallback}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
