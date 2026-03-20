"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { notificationService } from "@/lib/services/notification-service"
import { aiService } from "@/lib/services/ai"
import { X, Tag, Sparkles, ChevronDown, Wand2 } from "lucide-react"

import type { ExplainResponse } from "@/lib/types/api/ai"
import type { LocalVocabCard } from "@/lib/types/learning-session"
import { FloatingWindow } from "@/components/ui/floating-windows"
import { getModalZIndex } from "@/lib/utils/z-index-manager"
import { useAsyncAction } from "@/lib/hooks/use-async-action"

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

type ExplainPayload = {
  translations?: Record<string, string>
  examples?: Array<{ fr?: string }>
  notes?: string[]
  register?: string
}

const SUGGESTED_TAGS = ["#B2", "#Verbe", "#Nom", "#Académique", "#Expression", "#Oral"]

export function VocabCardModal({
  isOpen,
  onClose,
  onSave,
  selectedText = "",
  initialTranslation,
  initialNote,
  language,
  addVocabCard,
}: VocabCardModalProps) {
  const [word, setWord] = useState("")
  const [translation, setTranslation] = useState("")
  const [notes, setNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (selectedText) setWord(selectedText.trim())
    if (initialTranslation) setTranslation(initialTranslation)
    if (initialNote) {
      setNotes([initialNote])
      setShowMoreDetails(true)
    }
  }, [selectedText, initialTranslation, initialNote, isOpen])

  useEffect(() => {
    if (isOpen) return
    setWord("")
    setTranslation("")
    setNotes([])
    setNewNote("")
    setTags([])
    setNewTag("")
    setShowMoreDetails(false)
  }, [isOpen])

  const parseExplainPayload = (response: ExplainResponse): ExplainPayload | null => {
    const raw = response.content
    if (!raw) return null
    if (response.meta?.isJson && typeof raw === "object") {
      return raw as ExplainPayload
    }
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as ExplainPayload
      } catch {
        return null
      }
    }
    return null
  }

  const handleAddNote = () => {
    const nextNote = newNote.trim()
    if (nextNote && !notes.includes(nextNote)) {
      setNotes((prev) => [...prev, nextNote])
      setNewNote("")
    }
  }

  const handleRemoveNote = (noteToRemove: string) => {
    setNotes((prev) => prev.filter((note) => note !== noteToRemove))
  }

  const handleAddTag = () => {
    const nextTag = newTag.trim()
    if (nextTag && !tags.includes(nextTag)) {
      setTags((prev) => [...prev, nextTag])
      setNewTag("")
    }
  }

  const handleSelectSuggestedTag = (tagValue: string) => {
    if (!tags.includes(tagValue)) {
      setTags((prev) => [...prev, tagValue])
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const { isPending: isAutofilling, run: handleAutoFill } = useAsyncAction(async () => {
    if (!word.trim()) {
      notificationService.info("Saisissez d'abord un mot à analyser")
      return
    }

    try {
      const res = await aiService.explain({
        text: word.trim(),
        learning_lang: language,
        native_lang: "vi",
        target_langs: ["vi", "en"],
        level: "B1",
        include_examples: true,
        include_synonyms: false,
      })

      const payload = parseExplainPayload(res)
      const suggestedTranslation =
        payload?.translations?.vi ||
        payload?.translations?.en ||
        ""

      if (suggestedTranslation) {
        setTranslation(String(suggestedTranslation))
      }

      const exampleOrNote = payload?.examples?.[0]?.fr || payload?.notes?.[0] || ""
      if (exampleOrNote && !notes.includes(exampleOrNote)) {
        setNotes((prev) => [...prev, exampleOrNote])
        setShowMoreDetails(true)
      }

      if (payload?.register) {
        const registerTag = `#${payload.register}`
        if (!tags.includes(registerTag)) {
          setTags((prev) => [...prev, registerTag])
        }
      }

      notificationService.success("Suggestion IA ajoutée")
    } catch (error) {
      console.error("Failed to auto-fill translation:", error)
      notificationService.error("L'IA n'a pas pu suggérer de définition")
    }
  })

  const { isPending: isSaving, run: handleSave } = useAsyncAction(async () => {
    if (!word.trim()) {
      notificationService.error("Le mot est requis")
      return
    }

    try {
      const savedCard = await addVocabCard({
        word: word.trim(),
        translation: translation.trim() || null,
        notes: notes.length > 0 ? notes : [],
        tags: tags.length > 0 ? tags : [],
      })

      notificationService.success("Carte ajoutée au vocabulaire")
      onSave(savedCard)
      onClose()
    } catch (error) {
      console.error("Failed to save vocabulary card:", error)
      notificationService.error("Impossible d'enregistrer la carte")
    }
  })

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isSaving, onClose])

  if (!isOpen) return null

  const modalZIndex = getModalZIndex()

  return (
    <>
      <div className="fixed inset-0 bg-background/60" style={{ zIndex: modalZIndex.backdrop }} />
      <FloatingWindow
        id="vocab-card-modal"
        title="Ajouter une carte"
        persistKey="vocab-card-modal"
        defaultWidth={760}
        defaultHeight={560}
        defaultX={120}
        defaultY={80}
        forceZIndex={modalZIndex.content}
        onClose={onClose}
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.25fr)_240px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-surface-gradient-card p-6 shadow-sm">
              <div className="mb-5 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Carte rapide
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  Ajoutez un mot, laissez l’IA suggérer le sens, puis enregistrez.
                </h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mot ou expression</label>
                  <Input
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="ex. prendre la parole"
                    className="h-14 rounded-2xl border-slate-200 bg-white text-xl font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSave()
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sens principal</label>
                  <div className="relative">
                    <Input
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      placeholder="Saisissez la traduction ou laissez l’IA suggérer"
                      className="h-12 rounded-2xl border-slate-200 bg-white pr-12 text-base"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleSave()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      disabled={isAutofilling || isSaving}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary/8 text-primary transition hover:bg-primary/12 disabled:opacity-50"
                      aria-label="Suggestion IA"
                      title="Suggestion IA"
                    >
                      {isAutofilling ? <Wand2 className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    Ajouter plus de détails
                  </button>

                  {showMoreDetails && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex gap-2">
                        <Input
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Ajoutez une phrase de contexte ou une règle de grammaire..."
                          className="h-11 rounded-2xl border-slate-200 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddNote()
                            }
                          }}
                        />
                        <Button type="button" variant="outline" className="rounded-2xl" onClick={handleAddNote}>
                          Ajouter
                        </Button>
                      </div>

                      {notes.length > 0 && (
                        <div className="space-y-2">
                          {notes.map((note, index) => (
                            <div key={index} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                              <span className="pr-3">{note}</span>
                              <button
                                type="button"
                                className="mt-0.5 text-slate-400 transition hover:text-destructive"
                                onClick={() => handleRemoveNote(note)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-slate-500 hover:text-slate-900">
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !word.trim()}
                loading={isSaving}
                className="rounded-2xl bg-primary px-6 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer la carte"}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Contexte
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <span className="text-sm text-slate-500">Langue</span>
                  <Badge variant="outline" className="rounded-full">{language.toUpperCase()}</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Tags suggérés</p>
                    <p className="text-xs text-slate-500">Choisissez rapidement un registre ou un niveau.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TAGS.map((tagValue) => {
                      const isSelected = tags.includes(tagValue)
                      return (
                        <button
                          key={tagValue}
                          type="button"
                          onClick={() => handleSelectSuggestedTag(tagValue)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isSelected
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          {tagValue}
                        </button>
                      )
                    })}
                  </div>

                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajoutez un tag personnalisé"
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                  />

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => (
                        <Badge key={`${tag || "tag"}-${idx}`} variant="secondary" className="gap-1 rounded-full px-2.5 py-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            type="button"
                            className="ml-1 text-slate-400 transition hover:text-destructive"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </FloatingWindow>
    </>
  )
}
