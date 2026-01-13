"use client"

import { create } from "zustand"
import type { LearningLanguage } from "@/lib/services/learning-api"

type LearningLangState = {
  lang: LearningLanguage
  setLang: (v: LearningLanguage) => void
}

export const useLearningLangStore = create<LearningLangState>((set) => {
  // Initialize from localStorage with FR as default
  let initial: LearningLanguage = "fr"
  try {
    const v = localStorage.getItem("learning_lang") as LearningLanguage | null
    if (v === "en" || v === "fr") initial = v
  } catch {}

  // Sync via storage event
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "learning_lang" && (e.newValue === "en" || e.newValue === "fr")) {
        set({ lang: e.newValue as LearningLanguage })
      }
    })
  }

  return {
    lang: initial,
    setLang: (v) => {
      try { localStorage.setItem("learning_lang", v) } catch {}
      set({ lang: v })
    },
  }
})

