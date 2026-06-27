"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  EyeOff,
  Feather,
  Lightbulb,
  MessageSquare,
  PencilLine,
  Trash2,
  Users,
} from "lucide-react"

import { useAuth } from "@/lib/contexts/auth-context"
import {
  communityApi,
  type CommunityFeedback,
} from "@/lib/services/learning-community-api"
import { useAsyncAction } from "@/lib/hooks/use-async-action"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  planned: {
    label: "À planifier",
    className: "border-[#cda866] bg-[#fff7df] text-[#9b6b22]",
  },
  "in-progress": {
    label: "En cours",
    className: "border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-cream)]/70 text-[var(--vintage-desert-rock)]",
  },
  done: {
    label: "Réalisé",
    className: "border-[#b8aa8c] bg-[#f4f1ea] text-[#6f654f]",
  },
}

const feedbackDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const assetCacheVersion = "20260627-7"

function versionedBackgroundAsset(path: string) {
  return `${path}?v=${assetCacheVersion}`
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.planned

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        style.className,
      )}
    >
      {style.label}
    </span>
  )
}

function FeedbackCard({
  fb,
  isOwn,
  onDelete,
  onEdit,
  isDeleting,
  isEditingPending,
}: {
  fb: CommunityFeedback
  isOwn: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  isDeleting: boolean
  isEditingPending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fb.content)

  useEffect(() => {
    setDraft(fb.content)
  }, [fb.content])

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== fb.content) {
      onEdit(fb._id, trimmed)
    }
    setEditing(false)
  }

  const initial = (fb.display_name || "?").slice(0, 1).toUpperCase()

  return (
    <article className="rounded-[22px] border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)]/78 p-5 shadow-[0_12px_28px_rgba(74,51,35,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--vintage-desert-rock)] text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--vintage-ink)]">
                {fb.display_name}
              </p>
              {fb.is_incognito ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vintage-cream)] bg-[var(--vintage-porcelain-mist)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--vintage-muted-ink)]">
                  <EyeOff className="h-3 w-3" />
                  Incognito
                </span>
              ) : null}
            </div>
            <time className="mt-1 block text-xs text-[var(--vintage-muted-ink)]">
              {feedbackDateFormatter.format(new Date(fb.created_at))}
            </time>
          </div>
        </div>
        <StatusBadge status={fb.status} />
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-28 w-full resize-none rounded-2xl border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)] px-4 py-3 text-sm leading-6 text-[var(--vintage-ink)] outline-none transition focus:border-[var(--vintage-desert-rock)] focus:ring-2 focus:ring-[var(--vintage-desert-rock)]/15"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isEditingPending}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isEditingPending}
              className="rounded-full bg-[var(--vintage-desert-rock)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#8f7763] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditingPending ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setDraft(fb.content)
              }}
              disabled={isEditingPending}
              className="rounded-full border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)] px-4 py-2 text-xs font-semibold text-[var(--vintage-muted-ink)] transition hover:border-[var(--vintage-soft-sandstone)] hover:text-[var(--vintage-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex gap-3">
          <MessageSquare className="mt-1 h-4 w-4 shrink-0 text-[var(--vintage-desert-rock)]" />
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--vintage-ink)]">
            {fb.content}
          </p>
        </div>
      )}

      {isOwn && !editing ? (
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={isDeleting || isEditingPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)] px-3 py-1.5 text-xs font-medium text-[var(--vintage-muted-ink)] transition hover:border-[var(--vintage-soft-sandstone)] hover:text-[var(--vintage-ink)]"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Modifier
          </button>
          <button
            onClick={() => onDelete(fb._id)}
            disabled={isDeleting || isEditingPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      ) : null}
    </article>
  )
}

export default function CommunityPage() {
  const { user } = useAuth()
  const [feedbacks, setFeedbacks] = useState<CommunityFeedback[]>([])
  const [content, setContent] = useState("")
  const [isIncognito, setIsIncognito] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchFeedbacks = useCallback(async () => {
    try {
      setErrorMessage(null)
      const data = await communityApi.getFeedbacks()
      setFeedbacks(data)
    } catch (err) {
      console.error("Failed to load feedbacks:", err)
      setErrorMessage("Impossible de charger les idées pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const { isPending: submitting, run: submitFeedback } = useAsyncAction(async () => {
    const trimmed = content.trim()
    if (!trimmed) return

    setErrorMessage(null)
    const newFeedback = await communityApi.postFeedback(trimmed, isIncognito)
    setFeedbacks((prev) => [newFeedback, ...prev])
    setContent("")
    setIsIncognito(false)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || submitting) return

    try {
      await submitFeedback()
    } catch (err) {
      console.error("Failed to post feedback:", err)
      setErrorMessage("Votre idée n'a pas pu être envoyée. Réessayez dans un instant.")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (deletingId === id) return
      setDeletingId(id)
      setErrorMessage(null)
      await communityApi.deleteFeedback(id)
      setFeedbacks((prev) => prev.filter((fb) => fb._id !== id))
    } catch (err) {
      console.error("Failed to delete feedback:", err)
      setErrorMessage("Suppression impossible pour le moment.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = async (id: string, newContent: string) => {
    try {
      if (editingId === id) return
      setEditingId(id)
      setErrorMessage(null)
      const updated = await communityApi.updateFeedback(id, { content: newContent })
      setFeedbacks((prev) =>
        prev.map((fb) => (fb._id === id ? { ...fb, ...updated } : fb))
      )
    } catch (err) {
      console.error("Failed to update feedback:", err)
      setErrorMessage("Modification impossible pour le moment.")
    } finally {
      setEditingId(null)
    }
  }

  const ownFeedbackCount = useMemo(
    () => feedbacks.filter((fb) => fb.user_id === user?.sub).length,
    [feedbacks, user?.sub]
  )

  const activeMemberCount = useMemo(() => {
    const unique = new Set(feedbacks.map((fb) => fb.user_id))
    return unique.size
  }, [feedbacks])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5eee5] px-4 py-8 text-[var(--vintage-ink)] sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[length:1180px_auto] bg-top bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: `url('${versionedBackgroundAsset("/UI/map.webp")}')`,
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <section className="py-10 text-left">
          <div className="inline-flex items-center gap-4 rounded-none border-y border-[var(--vintage-soft-sandstone)] px-1 py-3 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--vintage-desert-rock)] sm:px-2">
            <span>Communauté</span>
          </div>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-[var(--vintage-ink)] sm:text-6xl">
            Forum des idées
          </h1>
          <p className="mt-4 max-w-2xl text-xl leading-8 text-[var(--vintage-muted-ink)]">
            Vos idées construisent MemoMap.
          </p>
          <div className="mt-8 h-px w-44 bg-[var(--vintage-soft-sandstone)]" />
        </section>

        <section className="rounded-[28px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/76 p-5 shadow-[0_22px_60px_rgba(74,51,35,0.14)] backdrop-blur-sm sm:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={Lightbulb} value={feedbacks.length} label="Idées partagées" />
            <StatCard icon={Feather} value={ownFeedbackCount} label="Vos publications" />
            <StatCard icon={Users} value={activeMemberCount} label="Membres actifs" />
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <section className="rounded-[28px] border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)]/78 p-6 shadow-[0_18px_45px_rgba(74,51,35,0.12)] backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--vintage-porcelain-mist)] text-[var(--vintage-desert-rock)]">
                <Feather className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--vintage-ink)]">
                Partager une idée
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <textarea
                id="feedback-input"
                className="min-h-56 w-full resize-none rounded-[20px] border border-[var(--vintage-soft-sandstone)]/55 bg-[var(--vintage-porcelain-mist)]/86 px-4 py-4 text-sm leading-7 text-[var(--vintage-ink)] shadow-inner shadow-[rgba(74,51,35,0.035)] outline-none transition placeholder:text-[var(--vintage-muted-ink)]/62 focus:border-[var(--vintage-desert-rock)] focus:bg-[var(--vintage-feather-white)]/62 focus:ring-2 focus:ring-[var(--vintage-desert-rock)]/15"
                rows={8}
                placeholder="Écrivez votre idée ici..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <label
                htmlFor="feedback-incognito"
                className="flex w-fit cursor-pointer items-center gap-3 text-sm text-[var(--vintage-ink)]"
              >
                <Checkbox
                  id="feedback-incognito"
                  checked={isIncognito}
                  onCheckedChange={(checked) => setIsIncognito(checked === true)}
                  className="h-5 w-5 rounded-md border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-cream)] text-[var(--vintage-feather-white)] shadow-sm shadow-[rgba(74,51,35,0.08)] focus-visible:ring-[var(--vintage-desert-rock)]/25 data-[state=checked]:border-[var(--vintage-desert-rock)] data-[state=checked]:bg-[var(--vintage-desert-rock)]"
                />
                <span>Publier en mode anonyme</span>
              </label>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!content.trim() || submitting}
                  loading={submitting}
                  className="h-12 min-w-44 rounded-full bg-[var(--vintage-desert-rock)] px-7 text-sm font-semibold text-[var(--vintage-feather-white)] shadow-[0_14px_28px_rgba(164,141,120,0.26)] transition hover:bg-[#8f7763] disabled:bg-[var(--vintage-soft-sandstone)] disabled:text-[var(--vintage-feather-white)] disabled:opacity-80"
                >
                  <Feather className="h-4 w-4" />
                  Publier
                </Button>
              </div>
            </form>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)]/78 p-6 shadow-[0_18px_45px_rgba(74,51,35,0.12)] backdrop-blur-sm">
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-semibold text-[var(--vintage-ink)]">
                Dernières idées
              </h2>
              <div className="mx-auto mt-4 h-px w-40 bg-[var(--vintage-soft-sandstone)]" />
            </div>

            {loading ? (
              <div className="flex justify-center py-14">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--vintage-desert-rock)] border-t-transparent" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/70 px-6 py-12 text-center">
                <MessageSquare className="mx-auto h-7 w-7 text-[var(--vintage-desert-rock)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--vintage-ink)]">
                  Aucune idée postée pour l&apos;instant
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--vintage-muted-ink)]">
                  Lancez la discussion avec une suggestion concrète.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {feedbacks.map((fb) => (
                  <FeedbackCard
                    key={fb._id}
                    fb={fb}
                    isOwn={user?.sub === fb.user_id}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    isDeleting={deletingId === fb._id}
                    isEditingPending={editingId === fb._id}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="rounded-[24px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/58 px-5 py-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-[var(--vintage-desert-rock)]" />
      <p className="mt-5 text-4xl font-semibold text-[var(--vintage-ink)]">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vintage-desert-rock)]">
        {label}
      </p>
    </div>
  )
}
