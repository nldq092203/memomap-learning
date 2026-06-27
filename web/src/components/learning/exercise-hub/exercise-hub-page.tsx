import Link from "next/link"
import type { ComponentType } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ExerciseHubAction {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  label?: string
}

interface ExerciseHubPageProps {
  eyebrow: string
  title: string
  description: string
  actions: ExerciseHubAction[]
  visualIcon: ComponentType<{ className?: string }>
  emptyTitle?: string
  emptyDescription?: string
}

export function ExerciseHubPage({
  eyebrow,
  title,
  description,
  actions,
  visualIcon: VisualIcon,
  emptyTitle,
  emptyDescription,
}: ExerciseHubPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5eee5] px-4 py-7 text-[var(--vintage-ink)] sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/UI/map.webp')] bg-[length:1180px_auto] bg-top bg-no-repeat opacity-[0.08]"
      />
      <div className="relative mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-medium text-[var(--vintage-muted-ink)] transition hover:text-[var(--vintage-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la carte
        </Link>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.7fr)] lg:items-end">
          <div className="text-left">
            <div className="inline-flex border-y border-[var(--vintage-soft-sandstone)] px-1 py-3 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--vintage-desert-rock)] sm:px-2">
              {eyebrow}
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-[var(--vintage-ink)] sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--vintage-muted-ink)]">
              {description}
            </p>
          </div>

          <div className="relative hidden min-h-[250px] overflow-hidden rounded-[32px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/72 shadow-[0_22px_60px_rgba(74,51,35,0.12)] backdrop-blur-sm lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(230,218,200,0.82),transparent_45%),radial-gradient(circle_at_70%_65%,rgba(164,141,120,0.16),transparent_42%)]" />
            <div className="absolute right-8 top-7 rounded-full border border-[var(--vintage-soft-sandstone)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--vintage-desert-rock)]">
              Paris
            </div>
            <div className="relative flex h-full min-h-[250px] items-center justify-center">
              <div className="flex h-36 w-36 items-center justify-center rounded-[36px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-cream)]/70 text-[var(--vintage-desert-rock)] shadow-[0_18px_42px_rgba(74,51,35,0.14)]">
                <VisualIcon className="h-20 w-20" />
              </div>
            </div>
          </div>
        </section>

        {actions.length > 0 ? (
          <section className="grid gap-5 lg:grid-cols-3">
            {actions.map((action) => (
              <ExerciseHubCard key={action.href} action={action} />
            ))}
          </section>
        ) : (
          <EmptyState
            title={emptyTitle ?? "Contenu bientôt disponible"}
            description={emptyDescription ?? "Cette section sera ajoutée dans une prochaine étape."}
            icon={VisualIcon}
          />
        )}
      </div>
    </main>
  )
}

function ExerciseHubCard({ action }: { action: ExerciseHubAction }) {
  const Icon = action.icon

  return (
    <Link
      href={action.href}
      className={cn(
        "group flex min-h-[300px] flex-col rounded-[28px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/78 p-6 shadow-[0_18px_45px_rgba(74,51,35,0.12)] backdrop-blur-sm transition",
        "hover:-translate-y-1 hover:bg-[var(--vintage-feather-white)] hover:shadow-[0_22px_54px_rgba(74,51,35,0.16)]",
      )}
    >
      <div className="flex min-h-[130px] items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--vintage-cream),var(--vintage-porcelain-mist))] text-[var(--vintage-desert-rock)]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--vintage-feather-white)]/68 shadow-[0_12px_26px_rgba(74,51,35,0.1)]">
          <Icon className="h-10 w-10" />
        </div>
      </div>

      <div className="mt-6 flex-1">
        {action.label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--vintage-desert-rock)]">
            {action.label}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--vintage-ink)]">
          {action.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--vintage-muted-ink)]">
          {action.description}
        </p>
      </div>

      <span className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--vintage-desert-rock)] px-5 text-sm font-semibold text-[var(--vintage-feather-white)] transition group-hover:bg-[#8f7763]">
        Continuer
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <section className="rounded-[28px] border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/78 p-8 shadow-[0_18px_45px_rgba(74,51,35,0.12)] backdrop-blur-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--vintage-ink)]">{title}</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--vintage-muted-ink)]">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
