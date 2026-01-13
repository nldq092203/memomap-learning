"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { LocalVocabCard, LearningSession } from "@/lib/types/learning-session"
import { notificationService } from "@/lib/services/notification-service"

interface SessionTabContextValue {
  // Tab state
  activeTab: "notes" | "vocab" | "tags" | "comments"
  setActiveTab: (tab: "notes" | "vocab" | "tags" | "comments") => void
  
  // Session + draft state (Entry removed)
  session: LearningSession | null
  sessionDraft: { transcript: string; notes: string[] }
  setSessionDraft: (
    draft:
      | { transcript: string; notes: string[] }
      | ((prev: { transcript: string; notes: string[] }) => { transcript: string; notes: string[] })
  ) => void
  
  // Form inputs
  newNote: string
  setNewNote: (note: string) => void
  newComment: string
  setNewComment: (comment: string) => void
  newTag: string
  setNewTag: (tag: string) => void
  
  // Vocabulary state
  entryVocabCards: LocalVocabCard[]
  showVocabForm: boolean
  setShowVocabForm: (show: boolean) => void
  vocabForm: {
    word: string
    translation: string
    notes: string[]
    tags: string[]
    newNote: string
    newTag: string
  }
  setVocabForm: (form: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string } | ((prev: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string }) => { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string })) => void
  
  // Handlers
  onAddNote: () => void
  onRemoveNote: (note: string) => void
  onAddComment: () => void
  onRemoveComment: (comment: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onVocabFormSubmit: () => void
  onVocabAddNote: () => void
  onVocabRemoveNote: (note: string) => void
  onVocabAddTag: () => void
  onVocabRemoveTag: (tag: string) => void
  onShowVocabModal: () => void
}

const SessionTabContext = createContext<SessionTabContextValue | undefined>(undefined)

export function useSessionTab() {
  const context = useContext(SessionTabContext)
  if (!context) {
    throw new Error('useSessionTab must be used within a SessionTabProvider')
  }
  return context
}

interface SessionTabProviderProps {
  children: React.ReactNode
  session: LearningSession | null
  sessionDraft: { transcript: string; notes: string[] }
  setSessionDraft: (
    draft:
      | { transcript: string; notes: string[] }
      | ((prev: { transcript: string; notes: string[] }) => { transcript: string; notes: string[] })
  ) => void
  entryVocabCards: LocalVocabCard[]
  updateSession: (data: Partial<LearningSession>) => Promise<void>
  addVocabCard: (data: { word: string; translation: string | null; notes: string[]; tags: string[] }) => Promise<LocalVocabCard>
}

export function SessionTabProvider({
  children,
  session,
  sessionDraft,
  setSessionDraft,
  entryVocabCards,
  updateSession,
  addVocabCard,
}: SessionTabProviderProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "vocab" | "tags" | "comments">("notes")
  const [newNote, setNewNote] = useState("")
  const [newComment, setNewComment] = useState("")
  const [newTag, setNewTag] = useState("")
  const [showVocabForm, setShowVocabForm] = useState(false)
  const [vocabForm, setVocabForm] = useState({
    word: "",
    translation: "",
    notes: [] as string[],
    tags: [] as string[],
    newNote: "",
    newTag: ""
  })

  // Tab content handlers
  const onAddNote = useCallback(() => {
    if (newNote.trim()) {
      const updatedNotes = [...(sessionDraft.notes || []), newNote.trim()]
      setSessionDraft((prev) => ({ ...prev, notes: updatedNotes }))
      setNewNote("")
    }
  }, [newNote, sessionDraft.notes, setSessionDraft])

  const onRemoveNote = useCallback((noteToRemove: string) => {
    const updatedNotes = (sessionDraft.notes || []).filter((note) => note !== noteToRemove)
    setSessionDraft((prev) => ({ ...prev, notes: updatedNotes }))
  }, [sessionDraft.notes, setSessionDraft])

  const onAddComment = useCallback(() => {
    if (!newComment.trim() || !session?.id) return
    const updatedComments = [...(session.comments || []), newComment.trim()]
    updateSession({ comments: updatedComments })
      setNewComment("")
  }, [newComment, session, updateSession])

  const onRemoveComment = useCallback((commentToRemove: string) => {
    if (!session?.id) return
    const updatedComments = (session.comments || []).filter((comment) => comment !== commentToRemove)
    updateSession({ comments: updatedComments })
  }, [session, updateSession])

  const onAddTag = useCallback(() => {
    if (!newTag.trim() || !session?.id) return
    const updatedTags = [...(session.tags || []), newTag.trim()]
    updateSession({ tags: updatedTags })
      setNewTag("")
  }, [newTag, session, updateSession])

  const onRemoveTag = useCallback((tagToRemove: string) => {
    if (!session?.id) return
    const updatedTags = (session.tags || []).filter((tag) => tag !== tagToRemove)
    updateSession({ tags: updatedTags })
  }, [session, updateSession])

  // Vocabulary handlers
  const onVocabFormSubmit = useCallback(async () => {
    if (!vocabForm.word.trim()) {
      notificationService.error("Word is required")
      return
    }

    try {
      await addVocabCard({
        word: vocabForm.word.trim(),
        translation: vocabForm.translation.trim() || null,
        notes: vocabForm.notes,
        tags: vocabForm.tags,
      })
      
      notificationService.success("Vocabulary card added! ✨")
      
      // Reset form
      setVocabForm({
        word: "",
        translation: "",
        notes: [],
        tags: [],
        newNote: "",
        newTag: ""
      })
      setShowVocabForm(false)
    } catch (error) {
      console.error('Failed to add vocabulary card:', error)
      notificationService.error("Failed to add vocabulary card")
    }
  }, [vocabForm, addVocabCard])

  const onVocabAddNote = useCallback(() => {
    if (vocabForm.newNote.trim() && !vocabForm.notes.includes(vocabForm.newNote.trim())) {
      setVocabForm((prev: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string }) => ({
        ...prev,
        notes: [...prev.notes, prev.newNote.trim()],
        newNote: ""
      }))
    }
  }, [vocabForm.newNote, vocabForm.notes])

  const onVocabRemoveNote = useCallback((noteToRemove: string) => {
    setVocabForm((prev: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string }) => ({
      ...prev,
      notes: prev.notes.filter(note => note !== noteToRemove)
    }))
  }, [])

  const onVocabAddTag = useCallback(() => {
    if (vocabForm.newTag.trim() && !vocabForm.tags.includes(vocabForm.newTag.trim())) {
      setVocabForm((prev: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string }) => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ""
      }))
    }
  }, [vocabForm.newTag, vocabForm.tags])

  const onVocabRemoveTag = useCallback((tagToRemove: string) => {
    setVocabForm((prev: { word: string; translation: string; notes: string[]; tags: string[]; newNote: string; newTag: string }) => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }, [])

  const onShowVocabModal = useCallback(() => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ""
    if (selectedText) {
      // This will be handled by the parent component
      notificationService.info("Please use the 'From Selection' button in the vocab tab")
    } else {
      notificationService.info("Please select text in the transcript first")
    }
  }, [])

  const value: SessionTabContextValue = {
    activeTab,
    setActiveTab,
    session,
    sessionDraft,
    setSessionDraft,
    newNote,
    setNewNote,
    newComment,
    setNewComment,
    newTag,
    setNewTag,
    entryVocabCards,
    showVocabForm,
    setShowVocabForm,
    vocabForm,
    setVocabForm,
    onAddNote,
    onRemoveNote,
    onAddComment,
    onRemoveComment,
    onAddTag,
    onRemoveTag,
    onVocabFormSubmit,
    onVocabAddNote,
    onVocabRemoveNote,
    onVocabAddTag,
    onVocabRemoveTag,
    onShowVocabModal
  }

  return (
    <SessionTabContext.Provider value={value}>
      {children}
    </SessionTabContext.Provider>
  )
}
