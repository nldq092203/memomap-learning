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
    { action: "addVocab", label: "Ajouter du vocabulaire", keys: "Cmd+Shift+A" },
    { action: "openAi", label: "Ouvrir l'assistant IA", keys: "Cmd+Shift+S" },
  ],
}
