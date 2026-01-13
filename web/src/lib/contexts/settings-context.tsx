"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useUserSettings } from "@/lib/hooks/use-user-settings"
import { useAuth } from "@/lib/contexts/auth-context"
import { type ShortcutBinding } from "@/lib/types/settings"

interface SettingsContextValue {
  shortcuts: ShortcutBinding[]
  getShortcut: (action: string) => ShortcutBinding | undefined
  isShortcutEnabled: (action: string) => boolean
  updateShortcut: (action: ShortcutBinding["action"], keys: string) => void
  saveToLocalStorage: (serverData?: unknown) => void // Manually save to localStorage
  setSettings: (settings: { shortcuts: ShortcutBinding[] }) => void // Update settings directly
  isLoading: boolean // Loading state for settings
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useAuth()
  const { settings, setSettings: setSettingsInternal, updateShortcut, saveToLocalStorage, isLoading } = useUserSettings()
  
  // Wrapper function to match the expected signature
  const setSettings = React.useCallback((newSettings: { shortcuts: ShortcutBinding[] }) => {
    setSettingsInternal({
      ...settings,
      ...newSettings,
    })
  }, [settings, setSettingsInternal])

  const contextValue = useMemo(() => ({
    shortcuts: settings.shortcuts,
    getShortcut: (action: string) => settings.shortcuts.find(s => s.action === action),
    isShortcutEnabled: (action: string) => {
      const shortcut = settings.shortcuts.find(s => s.action === action)
      return !!shortcut?.keys
    },
    updateShortcut,
    saveToLocalStorage,
    setSettings,
    isLoading
  }), [settings.shortcuts, updateShortcut, saveToLocalStorage, setSettings, isLoading])

  // Don't render children until auth is ready
  if (authLoading) {
    return null
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
  console.error("useSettings must be used within a SettingsProvider. Make sure SettingsProvider is wrapping your component.")
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  
  return context
}
