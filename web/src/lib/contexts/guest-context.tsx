"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/contexts/auth-context"
import type { DelfLevel } from "@/lib/types/api/delf"

/** Legacy single-level guest access used by features that still gate on one level only. */
export const GUEST_ALLOWED_LEVEL = "A2" as const

/** DELF guest access is enabled for both A2 and B1; backend still filters actual guest-visible tests. */
export const GUEST_ALLOWED_DELF_LEVELS: readonly DelfLevel[] = ["A2", "B1"]

interface GuestContextValue {
  isGuest: boolean
  /** Buffer an action to replay after login */
  setPendingAction: (action: () => Promise<void>) => void
  /** Execute the buffered action (call after login) */
  executePendingAction: () => Promise<void>
  /** Show / hide the Sync & Save modal */
  showSyncModal: boolean
  setShowSyncModal: (v: boolean) => void
}

const GuestContext = createContext<GuestContextValue | undefined>(undefined)

// ─── Provider ────────────────────────────────────────────────────────
export function GuestProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const isGuest = !isAuthenticated && !isLoading

  const [showSyncModal, setShowSyncModal] = useState(false)
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null)

  const setPendingAction = useCallback((action: () => Promise<void>) => {
    pendingActionRef.current = action
  }, [])

  const executePendingAction = useCallback(async () => {
    const action = pendingActionRef.current
    if (action) {
      pendingActionRef.current = null
      await action()
    }
  }, [])

  const value: GuestContextValue = {
    isGuest,
    setPendingAction,
    executePendingAction,
    showSyncModal,
    setShowSyncModal,
  }

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext)
  if (!ctx) {
    throw new Error("useGuest must be used within a GuestProvider")
  }
  return ctx
}
