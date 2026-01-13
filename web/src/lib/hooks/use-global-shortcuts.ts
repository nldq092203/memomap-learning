"use client"

import { useEffect, useCallback } from "react"
import { useSettings } from "@/lib/contexts/settings-context"

interface ShortcutHandler {
  addVocab?: () => void
  openAi?: () => void
}

export function useGlobalShortcuts(handlers: ShortcutHandler) {
  const { shortcuts } = useSettings()

  const parseKeyCombo = useCallback((combo: string) => {
    const parts = (combo || "")
      .toLowerCase()
      .split(/[+]/)
      .map(p => p.trim())
    const result = {
      ctrl: parts.includes("ctrl"),
      shift: parts.includes("shift"),
      alt: parts.includes("alt"),
      meta: parts.includes("meta") || parts.includes("cmd"),
      key: parts.find(p => !["ctrl", "cmd", "shift", "alt", "meta"].includes(p)) || "",
    }
    return result
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const currentCombo = [
        event.ctrlKey ? "ctrl" : "",
        event.shiftKey ? "shift" : "",
        event.altKey ? "alt" : "",
        event.metaKey ? "meta" : "",
        (event.key || "").toLowerCase(),
      ]
        .filter(Boolean)
        .join("+")

      const { ctrl, shift, alt, meta, key } = parseKeyCombo(currentCombo)

      for (const shortcut of shortcuts) {
        const shortcutObj = shortcut as { keys?: string; combo?: string }
        const binding = shortcutObj.keys || shortcutObj.combo || ""
        const shortcutCombo = parseKeyCombo(binding)

        if (
          shortcutCombo.ctrl === ctrl &&
          shortcutCombo.shift === shift &&
          shortcutCombo.alt === alt &&
          shortcutCombo.meta === meta &&
          shortcutCombo.key === key
        ) {
          event.preventDefault()
          event.stopPropagation()

          const action = shortcut.action

          switch (action) {
            case "addVocab":
              handlers.addVocab?.()
              break
            case "openAi":
              handlers.openAi?.()
              break
          }
          break
        }
      }
    },
    [shortcuts, handlers, parseKeyCombo],
  )

  useEffect(() => {
    const handleKeyDownWrapper = (event: KeyboardEvent) => handleKeyDown(event)
    document.addEventListener("keydown", handleKeyDownWrapper)
    return () => document.removeEventListener("keydown", handleKeyDownWrapper)
  }, [handleKeyDown, shortcuts])
}
