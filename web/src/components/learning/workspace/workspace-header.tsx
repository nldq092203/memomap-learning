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
    <div className="sticky top-14 z-10 border-b bg-background/80 backdrop-blur px-3 md:px-6 space-y-2 md:space-y-3">
      {/* Navigation + title row */}
      <div className="flex h-10 md:h-12 items-center justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs md:text-sm"
            onClick={onBack}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
          <Badge variant="outline" className="hidden md:inline-flex h-7 items-center rounded-full px-2 text-[11px]">
            {languageCode.toUpperCase()}
          </Badge>
          <Input
            value={lessonTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-8 md:h-9 w-full text-sm md:text-base"
            placeholder="Lesson name"
          />
        </div>

        {/* Save status + actions */}
        <div className="flex items-center justify-end gap-2 md:gap-3">
          {isSavingEntry ? (
            <span className="hidden md:inline-flex rounded-full border border-amber-200 px-2 py-0.5 text-[11px] text-amber-600">
              Saving…
            </span>
          ) : lastSavedAt ? (
            <span className="hidden md:inline-flex rounded-full border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-600">
              Saved locally ✨
            </span>
          ) : null}

          {onDiscardDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs md:text-sm text-destructive hover:text-destructive"
              onClick={onDiscardDraft}
            >
              Cancel &amp; delete draft
            </Button>
          )}

          {onSave && (
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-xs md:text-sm"
              onClick={onSave}
              disabled={isSavingToCloud}
            >
              {isSavingToCloud ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>

      <div className="pb-2">
        <p className="text-[11px] text-muted-foreground">
          Drafts are auto-saved locally every 5 seconds and kept for 7 days. After saving to the cloud, a backup copy
          stays on this device for 1 day.
        </p>
      </div>
    </div>
  )
})
