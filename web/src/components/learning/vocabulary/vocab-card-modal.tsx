"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { notificationService } from "@/lib/services/notification-service"
import { X, Plus, Tag } from "lucide-react"

import type { LocalVocabCard } from "@/lib/types/learning-session"
import { FloatingWindow } from "@/components/ui/floating-windows"
import { getModalZIndex } from "@/lib/utils/z-index-manager"

interface VocabCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (card: LocalVocabCard) => void
  selectedText?: string
  initialTranslation?: string | null
  initialNote?: string | null
  language: string
  addVocabCard: (cardData: {
    word: string
    translation: string | null
    notes: string[]
    tags: string[]
  }) => Promise<LocalVocabCard>
}

export function VocabCardModal({
  isOpen,
  onClose,
  onSave,
  selectedText = "",
  initialTranslation,
  initialNote,
  language,
  addVocabCard
}: VocabCardModalProps) {
  const [word, setWord] = useState("")
  const [translation, setTranslation] = useState("")
  const [notes, setNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Auto-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedText) {
        setWord(selectedText.trim())
      }
      if (initialTranslation) {
        setTranslation(initialTranslation)
      }
      if (initialNote) {
        setNotes([initialNote])
      }
    }
  }, [selectedText, initialTranslation, initialNote, isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWord("")
      setTranslation("")
      setNotes([])
      setNewNote("")
      setTags([])
      setNewTag("")
    }
  }, [isOpen])

  const handleAddNote = () => {
    if (newNote.trim() && !notes.includes(newNote.trim())) {
      setNotes(prev => [...prev, newNote.trim()])
      setNewNote("")
    }
  }

  const handleRemoveNote = (noteToRemove: string) => {
    setNotes(prev => prev.filter(note => note !== noteToRemove))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!word.trim()) {
      notificationService.error("Word is required")
      return
    }

    setIsSaving(true)
    try {
      const cardData = {
        word: word.trim(),
        translation: translation.trim() || null,
        notes: notes.length > 0 ? notes : [],
        tags: tags.length > 0 ? tags : [],
      }

      const savedCard = await addVocabCard(cardData)
      
      if (savedCard) {
        notificationService.success("Added to vocabulary ✨")
        onSave(savedCard)
        onClose()
      }
    } catch (error) {
      console.error('Failed to save vocabulary card:', error)
      notificationService.error("Failed to save vocabulary card")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalZIndex = getModalZIndex()

  return (
    <>
      <div className="fixed inset-0 bg-background/60" style={{ zIndex: modalZIndex.backdrop }} />
      <FloatingWindow
        id="vocab-card-modal"
        title="Add Vocabulary Card"
        persistKey="vocab-card-modal"
        defaultWidth={520}
        defaultHeight={480}
        defaultX={120}
        defaultY={80}
        forceZIndex={modalZIndex.content}
        onClose={onClose}
      >
        <div className="space-y-4">
          {/* Word */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Word *</label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Enter the word or phrase"
              className="font-medium"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
          </div>

          {/* Translation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Translation</label>
            <Input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Enter translation"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add note..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
              />
              <Button type="button" onClick={handleAddNote} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {notes.length > 0 && (
              <div className="space-y-1">
                {notes.map((note, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                    <span>{note}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveNote(note)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <Badge key={`${tag || "tag"}-${idx}`} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Language Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Language:</span>
            <Badge variant="outline">{language.toUpperCase()}</Badge>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !word.trim()}>
              {isSaving ? "Saving..." : "Save Card"}
            </Button>
          </div>
        </div>
      </FloatingWindow>
    </>
  )
}
