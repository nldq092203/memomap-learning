export type ShortcutAction =
  | "addVocab"
  | "openAi"
  | "pauseSession"
  | "stopSession"

export type ShortcutBinding = {
  action: ShortcutAction
  keys: string // e.g. "Cmd+Shift+A"
  label: string // Human-readable label
}

export type UserSettings = {
  shortcuts: ShortcutBinding[]
}

export const DEFAULT_SETTINGS: UserSettings = {
  shortcuts: [
    { action: "addVocab", label: "Add Vocabulary", keys: "Cmd+Shift+A" },
    { action: "openAi", label: "Open AI Assistant", keys: "Cmd+Shift+S" },
  ],
}
