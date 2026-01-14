"use client"

import React, { createContext, useContext } from "react"
import type { LearningLanguage } from "@/lib/services/learning-api"

type Ctx = {
  lang: LearningLanguage
  setLang: (v: LearningLanguage) => void
}

const LearningLangContext = createContext<Ctx | null>(null)

export function LearningLangProvider({ children }: { children: React.ReactNode }) {
  // Hardcoded to French - app is now French-focused
  const lang: LearningLanguage = "fr"
  
  // No-op function to maintain API compatibility
  const setLang = (_v: LearningLanguage) => {
    // Language is hardcoded to French, no changes allowed
  }

  return (
    <LearningLangContext.Provider value={{ lang, setLang }}>
      {children}
    </LearningLangContext.Provider>
  )
}

export function useLearningLang(): Ctx {
  const ctx = useContext(LearningLangContext)
  if (!ctx) throw new Error("useLearningLang must be used within LearningLangProvider")
  return ctx
}
