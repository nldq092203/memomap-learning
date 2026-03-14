"use client"

import React, { createContext, useContext } from "react"

type Ctx = {
  lang: "fr"
}

const LearningLangContext = createContext<Ctx | null>(null)

export function LearningLangProvider({ children }: { children: React.ReactNode }) {
  return (
    <LearningLangContext.Provider value={{ lang: "fr" }}>
      {children}
    </LearningLangContext.Provider>
  )
}

export function useLearningLang(): Ctx {
  const ctx = useContext(LearningLangContext)
  if (!ctx) throw new Error("useLearningLang must be used within LearningLangProvider")
  return ctx
}
