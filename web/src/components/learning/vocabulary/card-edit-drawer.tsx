"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Tag, X, Plus, Sparkles } from "lucide-react"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { toast } from "@/lib/toast"
import { FloatingWindow } from "@/components/ui/floating-windows"

interface CardEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: LearningVocabCard
  language: string
  onCardUpdated: (updated: LearningVocabCard) => void
}

export function CardEditDrawer({ open, onOpenChange, card, language, onCardUpdated }: CardEditDrawerProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [editWord, setEditWord] = useState("")
  const [editTranslation, setEditTranslation] = useState("")
  const [editNotes, setEditNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (open && card) {
      setEditWord(card.word ?? "")
      setEditTranslation(card.translation ?? "")
      setEditNotes(Array.isArray(card.notes) ? [...card.notes] : [])
      setEditTags(Array.isArray(card.tags) ? [...card.tags] : [])
      setNewNote("")
      setNewTag("")
    }
  }, [open, card])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (!isSaving) onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, isSaving, onOpenChange])

  if (!open || !card) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/60" />
      <FloatingWindow
        id="vocab-card-edit"
        title={card.word || "Edit Vocabulary Card"}
        persistKey="vocab-card-edit"
        defaultWidth={520}
        defaultHeight={480}
        defaultX={120}
        defaultY={80}
        forceZIndex={3000}
        onClose={() => {
          if (!isSaving) onOpenChange(false)
        }}
      >
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {language}
              </div>
              <div className="mt-1 text-xl font-semibold leading-tight break-words">
                {editWord || card.word}
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-primary/70" />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Word
              </p>
            </div>
            <Input
              value={editWord}
              onChange={(e) => setEditWord(e.target.value)}
              placeholder="Enter word…"
            />
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Translation</p>
            </div>
            <Textarea
              value={editTranslation}
              onChange={(e) => setEditTranslation(e.target.value)}
              placeholder="Enter translation…"
              className="min-h-[72px]"
            />
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add note..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = newNote.trim()
                      if (v && !editNotes.includes(v)) {
                        setEditNotes(prev => [...prev, v])
                        setNewNote("")
                      }
                    }
                  }}
                />
                <Button type="button" onClick={() => {
                  const v = newNote.trim()
                  if (v && !editNotes.includes(v)) {
                    setEditNotes(prev => [...prev, v])
                    setNewNote("")
                  }
                }} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editNotes.length > 0 && (
                <div className="space-y-1">
                  {editNotes.map((note, index) => (
                    <div key={`${note}-${index}`} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded text-sm text-muted-foreground">
                      <span className="pr-2 truncate">{note}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setEditNotes(editNotes.filter((n) => n !== note))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = newTag.trim()
                      if (value && !editTags.includes(value)) {
                        setEditTags(prev => [...prev, value])
                        setNewTag("")
                      }
                    }
                  }}
                />
                <Button type="button" onClick={() => {
                  const value = newTag.trim()
                  if (value && !editTags.includes(value)) {
                    setEditTags(prev => [...prev, value])
                    setNewTag("")
                  }
                }} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editTags.map((tag, idx) => (
                    <Badge key={`${tag || 'tag'}-${idx}`} variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="mt-3 flex w-full items-center justify-end gap-2 border-t pt-3">
           <Button variant="outline" onClick={() => { if (!isSaving) onOpenChange(false) }} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                const trimmedWord = editWord.trim()
                if (!trimmedWord) {
                  toast.error("Word cannot be empty")
                  return
                }

                setIsSaving(true)
                await learningVocabApi.update(card.id, {
                  language,
                  word: trimmedWord,
                  translation: editTranslation.trim() || null,
                  notes: editNotes,
                  tags: editTags,
                })
                // Optimistic local update regardless of server response shape
                onCardUpdated({
                  ...card,
                  word: trimmedWord,
                  translation: editTranslation.trim() || null,
                  notes: editNotes,
                  tags: editTags,
                  updated_at: new Date().toISOString(),
                } as LearningVocabCard)
                toast.success("Card updated ✓")
                onOpenChange(false)
              } catch (e) {
                console.error('Failed to update card', e)
                toast.error("Failed to update card")
              } finally {
                setIsSaving(false)
              }
            }}
            disabled={isSaving}
          >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </FloatingWindow>
    </>
  )
}
