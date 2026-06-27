"use client"

import { LoginButton } from "@/components/auth/login-button"
import { LogoutButton } from "@/components/auth/logout-button"
import { UserProfile } from "@/components/auth/user-profile"
import { useAuth } from "@/lib/contexts/auth-context"
import { BookOpen, Flame, MapPinned, Trophy } from "lucide-react"

const stats = [
  { label: "Série", value: "12", icon: Flame },
  { label: "Cartes vocab", value: "128", icon: BookOpen },
  { label: "Parcours", value: "6", icon: MapPinned },
  { label: "Objectifs", value: "4", icon: Trophy },
]

export default function ProfilePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--vintage-porcelain-mist)] px-4 py-6 text-[var(--vintage-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)] p-5 shadow-[0_24px_80px_rgba(74,51,35,0.12)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <section className="rounded-2xl border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)]/70 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--vintage-desert-rock)]">
              Profil
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--vintage-ink)]">
              Votre passeport d&apos;apprentissage
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--vintage-muted-ink)]">
              Retrouvez votre compte, vos préférences et votre progression.
            </p>

            <div className="mt-6 rounded-2xl border border-[var(--vintage-cream)] bg-[var(--vintage-porcelain-mist)] p-4">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <UserProfile showLogout={false} />
                  <LogoutButton variant="ghost" className="w-full justify-start rounded-xl">
                    Se déconnecter
                  </LogoutButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--vintage-muted-ink)]">
                    Connectez-vous pour synchroniser votre progression.
                  </p>
                  <LoginButton className="w-full justify-center rounded-xl" />
                </div>
              )}
            </div>
          </section>

          <section className="grid content-start gap-4 sm:grid-cols-2">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--vintage-cream)] bg-[var(--vintage-feather-white)]/70 p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-3xl font-semibold text-[var(--vintage-ink)]">{value}</p>
                <p className="mt-1 text-sm font-medium text-[var(--vintage-muted-ink)]">{label}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
