"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { LearningLanguage } from "@/lib/services/learning-api"

type Ctx = {
  lang: LearningLanguage
  setLang: (v: LearningLanguage) => void
}

const LearningLangContext = createContext<Ctx | null>(null)

export function LearningLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LearningLanguage>(() => {
    try {
      const v = localStorage.getItem("learning_lang") as LearningLanguage | null
      return (v === "en" || v === "fr") ? v : "fr"
    } catch { return "fr" }
  })

  const setLang = (v: LearningLanguage) => {
    setLangState(v)
    try { localStorage.setItem("learning_lang", v) } catch {}
  }

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "learning_lang" && (e.newValue === "en" || e.newValue === "fr")) {
        setLangState(e.newValue as LearningLanguage)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

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
