"use client"

import { useEffect, useMemo, useState } from "react"
import { DEFAULT_SETTINGS, type ShortcutBinding, type UserSettings } from "@/lib/types/settings"
import { useAuth } from "@/lib/contexts/auth-context"

const normalizeShortcuts = (source: unknown): ShortcutBinding[] => {
  const arr: unknown[] = Array.isArray(source) ? source : []
  const defaultFor = (action: string): string =>
    action === "addVocab"
      ? "Cmd+Shift+A"
      : action === "openAi"
        ? "Cmd+Shift+S"
        : ""

  const labelFor = (action: string): string =>
    action === "addVocab"
      ? "Add Vocabulary"
      : action === "openAi"
        ? "Open AI Assistant"
        : "Custom Action"

  return arr
    .map(s => {
      if (!s || typeof s !== "object") return null
      const obj = s as Record<string, unknown>
      const action = typeof obj.action === "string" ? obj.action : null
      if (!action) return null
      const keys = typeof obj.keys === "string" ? obj.keys : defaultFor(action)
      const label = typeof obj.label === "string" ? obj.label : labelFor(action)
      return { action: action as ShortcutBinding["action"], keys, label }
    })
    .filter(
      (s): s is ShortcutBinding =>
        !!s && (s.action === "addVocab" || s.action === "openAi"),
    )
}

export function useUserSettings() {
  const { user } = useAuth()
  const storageKey = user ? `learning_settings:${user.sub || user.email}` : null

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!storageKey) {
      setIsLoading(false)
      return
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const shortcuts = normalizeShortcuts(parsed?.shortcuts)
        setSettings({
          ...DEFAULT_SETTINGS,
          shortcuts: shortcuts.length ? shortcuts : DEFAULT_SETTINGS.shortcuts,
        })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }
    } catch {
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setIsLoading(false)
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings, storageKey])

  const updateShortcut = (action: ShortcutBinding["action"], keys: string) => {
    setSettings((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.map((s) => (s.action === action ? { ...s, keys } : s)),
    }))
  }

  const saveToLocalStorage = (serverData?: unknown) => {
    if (!storageKey) return
    try {
      if (serverData && typeof serverData === "object") {
        const data = serverData as Record<string, unknown>
        const shortcuts = normalizeShortcuts(data.shortcuts)
        const next: UserSettings = {
          ...DEFAULT_SETTINGS,
          shortcuts: shortcuts.length ? shortcuts : DEFAULT_SETTINGS.shortcuts,
        }
        window.localStorage.setItem(storageKey, JSON.stringify(next))
        setSettings(next)
        return
      }
      window.localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }

  return useMemo(
    () => ({
      settings,
      setSettings,
      updateShortcut,
      saveToLocalStorage,
      isLoading,
    }),
    [settings, isLoading],
  )
}

