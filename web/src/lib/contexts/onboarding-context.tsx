"use client"

import React, { createContext, useContext } from "react"

/**
 * Simplified onboarding context — no longer auto-redirects.
 * The feature guide is now a modal accessible from the learning dashboard.
 * This context is kept for API compatibility but does nothing.
 */

type UserLevel = "beginner" | "intermediate" | "advanced"
type DailyGoal = 15 | 30 | 60

interface UserPreferences {
  level: UserLevel
  dailyGoal: DailyGoal
}

interface OnboardingContextType {
  isCompleted: boolean
  preferences: UserPreferences | null
  setPreferences: (prefs: UserPreferences) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  // Always considered "completed" — no auto-redirect
  const value: OnboardingContextType = {
    isCompleted: true,
    preferences: { level: "beginner", dailyGoal: 30 },
    setPreferences: () => {},
    completeOnboarding: () => {},
    resetOnboarding: () => {},
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return context
}
