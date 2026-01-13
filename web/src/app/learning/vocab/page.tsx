"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import {
  Loader2,
  RefreshCw,
  Calendar,
  ArrowRight,
  Sparkles,
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
  const limit = 10
  const reqIdRef = useRef(0)
  const [deleteTarget, setDeleteTarget] = useState<LearningVocabCard | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<LearningVocabCard | null>(null)
  const pageCacheRef = useRef<Record<string, { items: LearningVocabCard[]; total: number }>>({})
  const [showAddModal, setShowAddModal] = useState(false)

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
  }, [language, page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted/20">
        <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Vocabulary Lab</h1>
                </div>
                <p className="text-muted-foreground text-base">
                  Browse, edit, and manage your learning cards
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={load}
                  disabled={loading || refreshing}
                  className="gap-2 h-10 px-4 bg-transparent"
                >
                  {loading || refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {loading || refreshing ? (slow ? "Loading..." : "Refreshing") : "Refresh"}
                </Button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="gap-2 h-10 px-4"
                >
                  <Plus className="h-4 w-4" />
                  New vocab
                </Button>
              </div>
            </div>

            {/* Filter card removed */}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Your Cards</CardTitle>
                <Badge variant="outline" className="font-mono">
                  {total} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && list.length === 0 && (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-lg bg-muted/40 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {list.length === 0 && !loading && (
                <div className="py-16 text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-muted">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">No cards found</p>
                  <p className="text-xs text-muted-foreground">
                    Add a new card to get started
                  </p>
                </div>
              )}

              {list.length > 0 && (
                <div className="divide-y">
                  {list.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 sm:p-5 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base sm:text-lg">{c.word}</span>
                            {c.translation && (
                              <span className="text-muted-foreground text-sm sm:text-base">
                                {c.translation}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {c.review_stats?.status && (
                              <Badge
                                variant={
                                  c.review_stats.status === "new"
                                    ? "default"
                                    : c.review_stats.status === "learning"
                                      ? "secondary"
                                      : c.review_stats.status === "review"
                                        ? "outline"
                                        : "secondary"
                                }
                                className="h-5 sm:h-6 text-[10px] sm:text-xs capitalize"
                              >
                                {c.review_stats.status}
                              </Badge>
                            )}

                            {(() => {
                              const d = parseDueDate(c.review_stats?.due_at)
                              return d ? (
                                <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  Due {d.toLocaleDateString()}
                                </span>
                              ) : null
                            })()}

                            {(c.tags || []).length > 0 && (
                              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                {(c.tags || []).map((t, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="h-5 sm:h-6 text-[10px] sm:text-xs font-normal"
                                  >
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mobile: always visible, row of icon buttons. Desktop: hover reveal with text */}
                        <div className="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 sm:px-3 sm:gap-1.5 bg-transparent"
                            onClick={() => {
                              // Open editor immediately with current list data for better UX
                              setEditingCard(c)

                              // Then refresh details in the background
                              ;(async () => {
                                try {
                                  const full = await learningVocabApi.get(c.id, language)
                                  setEditingCard((prev) => {
                                    // Only update if we're still editing this same card
                                    if (!prev || prev.id !== c.id) return prev
                                    return full
                                  })
                                } catch (error) {
                                  console.error("Failed to load vocabulary card", error)
                                  notificationService.error(
                                    "Failed to load latest details. Editing cached version.",
                                  )
                                }
                              })()
                            }}
                          >
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden text-xs">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-2 sm:px-3 gap-1 sm:gap-1.5 bg-primary hover:bg-primary/90"
                            onClick={() => {
                              setReviewCards([c])
                              setShowReview(true)
                            }}
                          >
                            <span className="text-xs sm:text-sm">Review</span>
                            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 sm:px-3 bg-transparent hidden sm:flex sm:gap-1.5"
                            onClick={() => setDeleteTarget(c)}
                          >
                            Suspend
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 sm:px-3 sm:gap-1.5 bg-transparent text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setHardDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading || refreshing}
                onClick={() => {
                  setPage((p) => p - 1)
                }}
                className="h-9"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border bg-muted/30 text-sm font-medium">
                <span>Page</span>
                <span className="font-mono">{page + 1}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-mono">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading || refreshing}
                onClick={() => {
                  setPage((p) => p + 1)
                }}
                className="h-9"
              >
                Next
              </Button>
            </div>
          )}
          {/* Edit drawer */}
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

          {/* Single-card review */}
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

          {/* Add new vocab */}
          <VocabCardModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={() => {
              // We already updated the server; just refresh current filters
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
              // Update current page list lazily if we're on first page
              if (page === 0 && created) {
                setList((prev) => [created, ...prev].slice(0, limit))
                setTotal((prev) => prev + 1)
              } else if (created) {
                setTotal((prev) => prev + 1)
              }
              // Clear cache so next navigation refetches with fresh data
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
              }
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
