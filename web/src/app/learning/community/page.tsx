"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Lightbulb,
  MessageSquareQuote,
  PencilLine,
  Rocket,
  Sparkles,
  Trash2,
} from "lucide-react"

import { SupportProjectTrigger } from "@/components/auth/support-project-trigger"
import { useAuth } from "@/lib/contexts/auth-context"
import {
  communityApi,
  type CommunityFeedback,
} from "@/lib/services/learning-community-api"

const STATUS_STYLES: Record<string, { chip: string; dot: string; label: string }> = {
  planned: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    label: "Planned",
  },
  "in-progress": {
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-400",
    label: "In Progress",
  },
  done: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
    label: "Done",
  },
}

const feedbackDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.planned

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

function FeedbackCard({
  fb,
  isOwn,
  onDelete,
  onEdit,
}: {
  fb: CommunityFeedback
  isOwn: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
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

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.26)]">
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.10),transparent_72%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{fb.email}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            <time>{feedbackDateFormatter.format(new Date(fb.created_at))}</time>
          </div>
        </div>
        <StatusBadge status={fb.status} />
      </div>

      {editing ? (
        <div className="relative mt-4 space-y-3">
          <textarea
            className="min-h-28 w-full resize-none rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none ring-0 transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Save changes
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setDraft(fb.content)
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="relative mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {fb.content}
        </p>
      )}

      {isOwn && !editing ? (
        <div className="relative mt-5 flex justify-end gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => onDelete(fb._id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchFeedbacks = useCallback(async () => {
    try {
      setErrorMessage(null)
      const data = await communityApi.getFeedbacks()
      setFeedbacks(data)
    } catch (err) {
      console.error("Failed to load feedbacks:", err)
      setErrorMessage("Impossible de charger les retours pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const newFeedback = await communityApi.postFeedback(trimmed)
      setFeedbacks((prev) => [newFeedback, ...prev])
      setContent("")
    } catch (err) {
      console.error("Failed to post feedback:", err)
      setErrorMessage("Votre message n'a pas pu être envoyé. Réessayez dans un instant.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setErrorMessage(null)
      await communityApi.deleteFeedback(id)
      setFeedbacks((prev) => prev.filter((fb) => fb._id !== id))
    } catch (err) {
      console.error("Failed to delete feedback:", err)
      setErrorMessage("Suppression impossible pour le moment.")
    }
  }

  const handleEdit = async (id: string, newContent: string) => {
    try {
      setErrorMessage(null)
      const updated = await communityApi.updateFeedback(id, { content: newContent })
      setFeedbacks((prev) =>
        prev.map((fb) => (fb._id === id ? { ...fb, ...updated } : fb))
      )
    } catch (err) {
      console.error("Failed to update feedback:", err)
      setErrorMessage("Modification impossible pour le moment.")
    }
  }

  const ownFeedbackCount = useMemo(
    () => feedbacks.filter((fb) => fb.user_id === user?.sub).length,
    [feedbacks, user?.sub]
  )

  const helperNotes = [
    "Proposez une fonctionnalité concrète ou un petit irritant du quotidien.",
    "Décrivez le contexte d'usage pour aider à prioriser.",
    "Un retour court et précis est souvent le plus utile.",
  ]

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-surface-gradient-transcribe-hero px-6 py-8 shadow-sm sm:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_60%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_280px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
              <Sparkles className="h-3.5 w-3.5" />
              Community Board
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Construisons MemoMap avec les vrais besoins des apprenants.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Déposez une idée, un irritant ou une amélioration concrète. Les retours ici
                servent à prioriser ce qui mérite d&apos;être construit ensuite.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {helperNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm"
                >
                  {note}
                </span>
              ))}
            </div>

            <div className="pt-1">
              <SupportProjectTrigger className="max-w-md" />
            </div>
          </div>

          <aside className="grid gap-3 self-start">
            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Shared ideas
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">{feedbacks.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Your posts
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">{ownFeedbackCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
              Les suggestions les plus claires sont plus simples à transformer en roadmap.
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <PencilLine className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Share feedback</h2>
                <p className="text-sm text-slate-500">
                  Une idée claire, un bug gênant ou une amélioration simple.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                id="feedback-input"
                className="min-h-40 w-full resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                rows={6}
                placeholder="Exemple: ajouter un mode review plus rapide pour réviser 20 cartes en 5 minutes, avec raccourcis clavier."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {content.trim().length > 0
                    ? `${content.trim().length} caractères prêts à être envoyés`
                    : "Plus c'est concret, plus c'est exploitable."}
                </p>
                <button
                  type="submit"
                  disabled={!content.trim() || submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket className="h-4 w-4" />
                  {submitting ? "Sending..." : "Send feedback"}
                </button>
              </div>
            </form>
          </div>

          {errorMessage ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Latest feedback</h2>
              <p className="text-sm text-slate-500">Newest first, visible to the whole community.</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[30px] border border-slate-200 bg-white/85 p-10 shadow-sm">
              <div className="flex justify-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/85 px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <MessageSquareQuote className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Aucune idée postée pour l&apos;instant</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Lancez la discussion avec une suggestion concrète ou un petit bug à corriger.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <FeedbackCard
                  key={fb._id}
                  fb={fb}
                  isOwn={user?.sub === fb.user_id}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
