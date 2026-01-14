"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

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

const STORAGE_KEY_COMPLETED = "onboarding_completed"
const STORAGE_KEY_PREFERENCES = "user_preferences"

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(STORAGE_KEY_COMPLETED) === "true"
    } catch {
      return false
    }
  })

  const [preferences, setPreferencesState] = useState<UserPreferences | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFERENCES)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const setPreferences = (prefs: UserPreferences) => {
    setPreferencesState(prefs)
    try {
      localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(prefs))
    } catch {
      // Ignore storage errors
    }
  }

  const completeOnboarding = () => {
    setIsCompleted(true)
    try {
      localStorage.setItem(STORAGE_KEY_COMPLETED, "true")
    } catch {
      // Ignore storage errors
    }
  }

  const resetOnboarding = () => {
    setIsCompleted(false)
    setPreferencesState(null)
    try {
      localStorage.removeItem(STORAGE_KEY_COMPLETED)
      localStorage.removeItem(STORAGE_KEY_PREFERENCES)
    } catch {
      // Ignore storage errors
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        isCompleted,
        preferences,
        setPreferences,
        completeOnboarding,
        resetOnboarding,
      }}
    >
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
