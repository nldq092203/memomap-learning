"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import {
  Loader2,
  RefreshCw,
  Calendar,
  ArrowRight,
  BookOpen,
  Trash2,
  Plus,
} from "lucide-react"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { CardEditDrawer } from "@/components/learning/vocabulary/card-edit-drawer"
import { ReviewModal } from "@/components/learning/review/session-review-modal"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { notificationService } from "@/lib/services/notification-service"
import { VocabCardModal } from "@/components/learning/vocabulary/vocab-card-modal"
import { VocabCard } from "@/components/learning/vocabulary/vocab-card"
import { VocabControlBar } from "@/components/learning/vocabulary/vocab-control-bar"
import { cn } from "@/lib/utils"

export default function VocabPage() {
  const { lang: language } = useLearningLang()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("")
  const [tag, setTag] = useState<string>("")
  const [dueBefore, setDueBefore] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [slow, setSlow] = useState(false)
  const [list, setList] = useState<LearningVocabCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [editingCard, setEditingCard] = useState<LearningVocabCard | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [reviewCards, setReviewCards] = useState<LearningVocabCard[]>([])
  const limit = 30
  const reqIdRef = useRef(0)
  const [deleteTarget, setDeleteTarget] = useState<LearningVocabCard | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<LearningVocabCard | null>(null)
  const pageCacheRef = useRef<Record<string, { items: LearningVocabCard[]; total: number }>>({})
  const [showAddModal, setShowAddModal] = useState(false)

  // New state for revamped UI
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  const parseDueDate = (iso?: string): Date | null => {
    if (!iso) return null
    try {
      let s = iso
      // Normalize "+hh:mmZ" -> "+hh:mm"
      s = s.replace(/(\+\d{2}:\d{2})Z$/, "$1")
      // Reduce fractional seconds to 3 digits (ms)
      s = s.replace(/\.(\d{3})\d+/, ".$1")
      const d = new Date(s)
      return isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }

  const makePageKey = (
    lang: string,
    qValue: string,
    statusValue: string,
    tagValue: string,
    dueValue: string,
    pageValue: number,
  ) => `${lang}|${qValue}|${statusValue}|${tagValue}|${dueValue}|${pageValue}`

  const load = async () => {
    const id = ++reqIdRef.current
    const cacheKey = makePageKey(language, q, status, tag, dueBefore, page)

    const cached = pageCacheRef.current[cacheKey]
    if (cached) {
      setList(cached.items)
      setTotal(cached.total)
      return
    }
    const hasData = list.length > 0
    setSlow(false)
    if (hasData) setRefreshing(true)
    else setLoading(true)
    const timer = setTimeout(() => setSlow(true), 1200)
    try {
      const res = await learningVocabApi.list({
        language,
        q,
        status,
        tag,
        due_before: dueBefore,
        limit,
        offset: page * limit,
      })
      if (id === reqIdRef.current) {
        setList(res.items)
        setTotal(res.total)
        pageCacheRef.current[cacheKey] = { items: res.items, total: res.total }
      }
    } finally {
      clearTimeout(timer)
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [language, page, q, status, tag, dueBefore]) // Added q and status to dependency to auto-reload on filter change

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total])

  const handleToggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedCards)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedCards(next)
  }

  const handleClearSelection = () => setSelectedCards(new Set())

  const handleBulkAction = async (action: string) => {
     if (action === "delete") {
        // Simple confirmation before bulk delete logic (placeholder)
        // In a real app we'd use the dialog. For now we just show a toast state mock
        notificationService.success(`Deleted ${selectedCards.size} cards (Demo)`)
        setSelectedCards(new Set())
     }
  }
  
  // Update query state wrappers
  const handleSearchChange = (val: string) => {
    setQ(val)
    setPage(0)
  }
  const handleStatusChange = (val: string) => {
    console.log("Filter change:", val)
    setStatus(val === "all" ? "" : val)
    setPage(0)
  }

  useEffect(() => {
    console.log("Loading with:", { language, q, status, tag, dueBefore, page })
    load()
  }, [language, page, q, status, tag, dueBefore])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          
          {/* Main Layout: Control Bar + Content */}
          <div className="space-y-6">
             {/* Header Title Area */}
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-6 w-6" />
                   </div>
                   <h1 className="text-3xl font-bold tracking-tight">Vocabulary Lab</h1>
                </div>
                <p className="text-muted-foreground ml-11">
                   Manage your personal dictionary and track your mastery.
                </p>
             </div>

             {/* Control Bar */}
             <div className="sticky top-4 z-20 bg-background/80 backdrop-blur-md p-2 rounded-2xl border shadow-sm ring-1 ring-border/40">
                <VocabControlBar 
                   searchQuery={q}
                   onSearchChange={handleSearchChange}
                   statusFilter={status || "all"}
                   onStatusFilterChange={handleStatusChange}
                   viewMode={viewMode}
                   onViewModeChange={setViewMode}
                   totalCount={total}
                   selectedCount={selectedCards.size}
                   onClearSelection={handleClearSelection}
                   onBulkAction={handleBulkAction}
                   onAddWord={() => setShowAddModal(true)}
                />
             </div>
             
             {/* Content Area */}
             <div className="min-h-[400px]">
                {loading && list.length === 0 ? (
                   <div className={cn(
                      "grid gap-4",
                      viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                   )}>
                      {[...Array(6)].map((_, i) => (
                         <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                      ))}
                   </div>
                ) : list.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl border-muted">
                      <div className="p-4 rounded-full bg-muted/50">
                         <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <div className="space-y-1">
                         <h3 className="text-lg font-medium">No words found</h3>
                         <p className="text-muted-foreground max-w-xs mx-auto">
                            Try adjusting your filters or add your first vocabulary word.
                         </p>
                      </div>
                      <Button onClick={() => setShowAddModal(true)}>
                         <Plus className="h-4 w-4 mr-2" /> Add Word
                      </Button>
                   </div>
                ) : (
                   <div className={cn(
                      "grid gap-3 transition-all duration-300",
                      viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                   )}>
                      {list.filter(card => {
                        if (status && status !== "all" && card.status !== status) return false
                        return true
                      }).map((card) => (
                         <VocabCard 
                            key={card.id} 
                            card={card}
                            viewMode={viewMode}
                            selected={selectedCards.has(card.id)}
                            onSelect={(checked) => handleToggleSelect(card.id, checked)}
                            onEdit={setEditingCard}
                            onDelete={setDeleteTarget}
                            onPlayAudio={(text) => {
                               // Simple TTS placeholder
                               const u = new SpeechSynthesisUtterance(text)
                               u.lang = "fr-FR"
                               window.speechSynthesis.speak(u)
                            }}
                         />
                      ))}
                   </div>
                )}
             </div>

             {/* Pagination */}
             {totalPages > 1 && (
                <div className="flex justify-center pt-8 pb-12">
                   <div className="flex items-center gap-2 bg-background p-1 rounded-lg border shadow-sm">
                      <Button
                         variant="ghost"
                         size="sm"
                         disabled={page === 0 || loading}
                         onClick={() => setPage(p => p - 1)}
                      >
                         Previous
                      </Button>
                      <span className="text-sm font-medium px-4">
                         {page + 1} of {totalPages}
                      </span>
                      <Button
                         variant="ghost"
                         size="sm"
                         disabled={page >= totalPages - 1 || loading}
                         onClick={() => setPage(p => p + 1)}
                      >
                         Next
                      </Button>
                   </div>
               </div>
             )}
          </div>

          {/* ... Modals (Edit, Review, Confirmation, Add) ... */}
          <CardEditDrawer
            open={!!editingCard}
            onOpenChange={(open) => {
              if (!open) setEditingCard(null)
            }}
            card={editingCard ?? undefined}
            language={language}
            onCardUpdated={(updated) => {
              setList((prev) =>
                prev.map((card) => (card.id === updated.id ? updated : card)),
              )
              setEditingCard(updated)
            }}
          />

          <ReviewModal
            isOpen={showReview}
            vocabCards={reviewCards}
            language={language}
            onComplete={async () => {
              await load()
            }}
            onOpenChange={setShowReview}
          />

          <ConfirmationDialog
            open={!!deleteTarget}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null)
            }}
            title="Suspend vocabulary card?"
            description={
              deleteTarget
                ? `This will suspend "${deleteTarget.word}" for review. You can restore it later.`
                : "This will suspend this card for review. You can restore it later."
            }
            confirmText="Suspend"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={async () => {
              if (!deleteTarget) return
              const target = deleteTarget
              // First perform a soft delete (suspend) for this language
              await notificationService.withLoading(
                async () => {
                  await learningVocabApi.remove(target.id)
                  setList((prev) =>
                    prev.filter((card) => card.id !== target.id),
                  )
                },
                "Suspending card…",
                "Card suspended",
                "Failed to suspend card",
              )
              setDeleteTarget(null)
            }}
          />

          <ConfirmationDialog
            open={!!hardDeleteTarget}
            onOpenChange={(open) => {
              if (!open) setHardDeleteTarget(null)
            }}
            title="Delete vocabulary card permanently?"
            description={
              hardDeleteTarget
                ? `This will permanently delete "${hardDeleteTarget.word}" from your vocabulary. You can't undo this.`
                : "This will permanently delete this card. You can't undo this."
            }
            confirmText="Delete permanently"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={async () => {
              if (!hardDeleteTarget) return
              const target = hardDeleteTarget
              setHardDeleteTarget(null)
              await notificationService.withLoading(
                async () => {
                  await learningVocabApi.hardRemove(target.id, language)
                  setList((prev) =>
                    prev.filter((card) => card.id !== target.id),
                  )
                  setTotal((prev) => Math.max(0, prev - 1))
                },
                "Deleting card…",
                "Card deleted",
                "Failed to delete card",
              )
            }}
          />

          <VocabCardModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={() => {
              pageCacheRef.current = {}
              load()
            }}
            selectedText=""
            initialTranslation={null}
            initialNote={null}
            language={language}
            addVocabCard={async (cardData) => {
              const res = await learningVocabApi.bulkImport(language, [
                {
                  word: cardData.word,
                  translation: cardData.translation,
                  notes: cardData.notes,
                  tags: cardData.tags,
                },
              ])
              const created = res.items[0]
              if (page === 0 && created) {
                setList((prev) => [created, ...prev].slice(0, limit))
                setTotal((prev) => prev + 1)
              } else if (created) {
                setTotal((prev) => prev + 1)
              }
              pageCacheRef.current = {}
              return {
                id: created.id,
                sessionId: "",
                word: created.word,
                translation: created.translation,
                notes: created.notes,
                tags: created.tags,
                language: created.language,
                createdAt: created.created_at,
                updatedAt: created.updated_at,
                status: 'new',
                due_at: null,
                last_reviewed_at: null,
                interval_days: 0,
                ease: 0,
                reps: 0,
                lapses: 0,
                streak_correct: 0,
                last_grade: null
              }
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
