"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, X } from "lucide-react"
import { useSessionTab } from "@/lib/contexts/session-tab-context"

export function TabContent() {
  const {
    activeTab,
    session,
    sessionDraft,
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
    onVocabRemoveTag
  } = useSessionTab()

  if (activeTab === "notes") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddNote() } }}
            placeholder="Ajouter une note"
            className="h-8"
            aria-label="Nouvelle note"
          />
          <Button size="sm" onClick={onAddNote} className="gap-1" aria-label="Ajouter une note">
            <Plus className="h-3.5 w-3.5"/>Ajouter
          </Button>
        </div>
        <div className="max-h-64 overflow-auto divide-y rounded-2xl border border-slate-200 bg-white">
          {(sessionDraft.notes || []).length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">Aucune note pour le moment.</div>
          ) : (
            (sessionDraft.notes || []).map((note: string, index: number) => (
              <div key={`note-${index}-${note?.slice(0, 10) || 'empty'}`} className="flex items-start justify-between gap-2 p-3">
                <div className="text-sm whitespace-pre-wrap break-words">{note}</div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveNote(note)} 
                  aria-label="Supprimer la note" 
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (activeTab === "vocab") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cartes de vocabulaire</span>
                    {entryVocabCards.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {entryVocabCards.length}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowVocabForm(!showVocabForm)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Inline Add Form */}
        {showVocabForm && (
          <Card className="border-dashed p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Ajouter une carte</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowVocabForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Mot *</label>
                  <Input
                    value={vocabForm.word}
                    onChange={(e) => setVocabForm((prev) => ({ ...prev, word: e.target.value }))}
                    placeholder="Saisir le mot"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Traduction</label>
                  <Input
                    value={vocabForm.translation}
                    onChange={(e) => setVocabForm((prev) => ({ ...prev, translation: e.target.value }))}
                    placeholder="Saisir la traduction"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Notes</label>
                <div className="flex gap-2">
                  <Input
                    value={vocabForm.newNote}
                    onChange={(e) => setVocabForm((prev) => ({ ...prev, newNote: e.target.value }))}
                    placeholder="Ajouter une note..."
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onVocabAddNote()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={onVocabAddNote}
                    size="sm"
                    variant="outline"
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {vocabForm.notes.length > 0 && (
                  <div className="space-y-1">
                    {vocabForm.notes.map((note, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-xs">
                        <span>• {note}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => onVocabRemoveNote(note)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Tags</label>
                <div className="flex gap-2">
                  <Input
                    value={vocabForm.newTag}
                    onChange={(e) => setVocabForm((prev) => ({ ...prev, newTag: e.target.value }))}
                    placeholder="Ajouter un tag..."
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onVocabAddTag()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={onVocabAddTag}
                    size="sm"
                    variant="outline"
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {vocabForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vocabForm.tags.map((tag, idx) => (
                      <Badge key={`${tag || 'tag'}-${idx}`} variant="secondary" className="text-xs gap-1">
                        {tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => onVocabRemoveTag(tag)}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-full sm:w-auto"
                  onClick={() => setShowVocabForm(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="h-10 w-full sm:w-auto"
                  onClick={onVocabFormSubmit}
                  disabled={!vocabForm.word.trim()}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {entryVocabCards.length === 0 && !showVocabForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune carte pour le moment</p>
            <p className="text-xs">Cliquez sur « Ajouter » pour en creer une.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {entryVocabCards.map((card) => (
              <Card key={card.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">{card.word}</div>
                    <Badge variant="outline" className="text-xs">
                      {card.language.toUpperCase()}
                    </Badge>
                  </div>
                  {card.translation && (
                    <div className="text-sm text-muted-foreground">
                      {card.translation}
                    </div>
                  )}
                  {card.notes && card.notes.length > 0 && (
                    <div className="space-y-1">
                      {card.notes.map((note: string, index: number) => (
                        <div key={index} className="text-xs italic text-muted-foreground">
                          • {note}
                        </div>
                      ))}
                    </div>
                  )}
                  {(card.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(card.tags || []).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeTab === "tags") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Ajouter un tag..."
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAddTag()
              }
            }}
          />
          <Button onClick={onAddTag} size="sm" className="gap-1">
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(session?.tags || []).map((tag: string, index: number) => (
            <Badge key={`tag-${index}-${tag || 'empty'}`} variant="secondary" className="gap-1">
              {tag}
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onRemoveTag(tag)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  if (activeTab === "comments") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAddComment()
              }
            }}
          />
          <Button onClick={onAddComment} size="sm" className="gap-1">
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        </div>
        <div className="space-y-2 max-h-64 overflow-auto">
          {(session?.comments || []).map((comment: string, index: number) => (
            <div
              key={`comment-${index}-${comment?.slice(0, 10) || 'empty'}`}
              className="flex items-start justify-between gap-2 bg-muted p-2 rounded text-xs"
            >
              <span className="flex-1 min-w-0 whitespace-pre-wrap break-words">
                {comment}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onRemoveComment(comment)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
