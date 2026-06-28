import { Plus } from "lucide-react"

export function VocabShortcutHint() {
  return (
    <div className="rounded-2xl border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-cream)]/70 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--vintage-desert-rock)] text-[var(--vintage-feather-white)]">
            <Plus className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--vintage-ink)]">Ajouter un mot rapidement</p>
            <p className="text-sm text-[var(--vintage-muted-ink)]">Sélectionnez du texte, puis utilisez le raccourci.</p>
          </div>
        </div>
        <kbd className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] px-4 text-sm font-semibold text-[var(--vintage-desert-rock)] shadow-sm">
          Cmd + Shift + A
        </kbd>
      </div>
    </div>
  )
}
