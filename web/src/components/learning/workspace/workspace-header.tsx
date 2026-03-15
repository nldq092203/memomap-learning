import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface WorkspaceHeaderProps {
  languageCode: string
  lessonTitle: string
  isSavingEntry: boolean
  lastSavedAt: number | null
  onBack: () => void
  onTitleChange: (value: string) => void
  onSave?: () => void
  onDiscardDraft?: () => void
  isSavingToCloud?: boolean
}

/**
 * WorkspaceHeader renders the fixed header zone for the learning workspace.
 * It combines navigation, language badge, lesson title input and save status.
 */
export const WorkspaceHeader = memo(function WorkspaceHeader({
  languageCode,
  lessonTitle,
  isSavingEntry,
  lastSavedAt,
  onBack,
  onTitleChange,
  onSave,
  onDiscardDraft,
  isSavingToCloud,
}: WorkspaceHeaderProps) {
  return (
    <div className="sticky top-14 z-10 border-b border-black/[0.04] bg-white/70 backdrop-blur-xl px-4 md:px-8 py-2 md:py-3 transition-all">
      {/* Navigation + title row */}
      <div className="flex h-10 md:h-12 items-center justify-between gap-2 md:gap-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 md:h-9 px-2.5 text-xs md:text-sm font-medium rounded-full text-muted-foreground hover:text-foreground transition-colors"
            onClick={onBack}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Badge variant="secondary" className="hidden md:inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold bg-primary/5 text-primary">
            {languageCode.toUpperCase()}
          </Badge>
          <div className="flex-1 max-w-lg">
            <Input
              value={lessonTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="h-8 md:h-9 w-full text-sm md:text-base font-medium border-transparent hover:border-black/[0.08] focus:border-black/[0.08] bg-transparent hover:bg-white/50 focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary/10 shadow-none px-2"
              placeholder="Lesson name"
            />
          </div>
        </div>

        {/* Save status + actions */}
        <div className="flex items-center justify-end gap-2 md:gap-3">
          {isSavingEntry ? (
            <span className="hidden md:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium text-amber-600 bg-amber-50">
              Saving…
            </span>
          ) : lastSavedAt ? (
            <span className="hidden md:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium text-emerald-600 bg-emerald-50">
              Saved locally ✨
            </span>
          ) : null}

          {onDiscardDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 md:h-9 px-3 text-xs md:text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              onClick={onDiscardDraft}
            >
              Cancel &amp; delete draft
            </Button>
          )}

          {onSave && (
            <Button
              type="button"
              size="sm"
              className="h-8 md:h-9 px-4 md:px-5 text-xs md:text-sm font-medium rounded-full shadow-sm"
              onClick={onSave}
              disabled={isSavingToCloud}
            >
              {isSavingToCloud ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})
