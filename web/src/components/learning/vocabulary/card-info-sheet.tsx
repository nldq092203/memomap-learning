"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Sparkles, Tag, X, Plus, Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { notificationService } from "@/lib/services/notification-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

interface CardInfoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: LearningVocabCard
  language: string
  onCardUpdated: (updated: LearningVocabCard) => void
}

export function CardInfoSheet({ open, onOpenChange, card, language, onCardUpdated }: CardInfoSheetProps) {
  const [tab, setTab] = useState<"overview" | "edit" | "stats">("overview")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editTranslation, setEditTranslation] = useState("")
  const [editNotes, setEditNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (open && card) {
      setEditTranslation(card.translation ?? "")
      setEditNotes(Array.isArray(card.notes) ? [...card.notes] : [])
      setEditTags(Array.isArray(card.tags) ? [...card.tags] : [])
      setNewNote("")
      setNewTag("")
      setTab("overview")
    }
  }, [open, card])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">Card Info</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto p-0 pt-0 text-left">
          {/* Header */}
          <div className="p-4 pb-3 border-b bg-primary/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{language}</div>
                <div className="mt-1 text-2xl font-semibold leading-tight break-words">{card?.word}</div>
              </div>
              <Sparkles className="h-5 w-5 text-primary/70" />
            </div>
          </div>

          {/* Tabs */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "overview" | "edit" | "stats")} className="w-full">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  {tab !== "edit" ? (
                    <Button variant="outline" size="sm" onClick={() => setTab("edit")} className="ml-2">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSavingEdit}
                        onClick={() => {
                          if (!card) return
                          setEditTranslation(card.translation ?? "")
                          setEditNotes(Array.isArray(card.notes) ? [...card.notes] : [])
                          setEditTags(Array.isArray(card.tags) ? [...card.tags] : [])
                          setNewNote("")
                          setNewTag("")
                          setTab("overview")
                        }}
                      >
                        Cancel
                      </Button>
                <Button
                  size="sm"
                  disabled={isSavingEdit}
                  onClick={async () => {
                    if (!card) return
                    try {
                      setIsSavingEdit(true)
                      await learningVocabApi.update(card.id, {
                        language,
                        translation: editTranslation.trim() || null,
                        notes: editNotes,
                        tags: editTags,
                      })
                      onCardUpdated({
                        ...card,
                        translation: editTranslation.trim() || null,
                        notes: editNotes,
                        tags: editTags,
                        updated_at: new Date().toISOString(),
                      } as LearningVocabCard)
                      setTab("overview")
                      notificationService.success("Card updated ✓")
                    } catch (e) {
                      console.error('Failed to update card', e)
                      notificationService.error("Failed to update card")
                          } finally {
                            setIsSavingEdit(false)
                          }
                        }}
                      >
                        {isSavingEdit ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-3 space-y-4">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Translation</p>
                    </div>
                    <p className="text-sm leading-relaxed">{card?.translation || "—"}</p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
                    {card?.notes?.length ? (
                      <ul className="space-y-2">
                        {card.notes.map((note, index) => (
                          <li key={index} className="text-sm leading-relaxed rounded-md bg-muted/30 px-3 py-2 text-muted-foreground">“{note}”</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</p>
                    </div>
                    {card?.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {card.tags.map((tag, idx) => (
                          <span key={`${tag || 'tag'}-${idx}`} className="px-2.5 py-1 text-[11px] rounded-full bg-primary/10 text-primary border border-primary/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </TabsContent>

                {/* Edit Tab */}
                <TabsContent value="edit" className="mt-3 space-y-4">
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
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="mt-3">
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Review Stats</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="capitalize">{card?.status ?? "—"}</span>
                      </div>
                      <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Ease</span>
                        <span>{card?.ease ? card.ease.toFixed(2) : "—"}</span>
                      </div>
                      <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Reps</span>
                        <span>{card?.reps ?? "—"}</span>
                      </div>
                      <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Interval</span>
                        <span>{card?.interval_days ? `${card.interval_days} d` : "—"}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
