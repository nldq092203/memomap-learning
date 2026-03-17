"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { LoginButton } from "@/components/auth/login-button"
import { Cloud, BookMarked, TrendingUp, Shield } from "lucide-react"

interface SyncSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const benefits = [
  {
    icon: Cloud,
    label: "Google Drive Sync",
    text: "Sauvegardez l'audio et les textes sur votre cloud personnel. / Save audio and texts to your personal cloud.",
    color: "text-sky-500",
    bg: "bg-sky-50",
  },
  {
    icon: BookMarked,
    label: "Vocabulary Lab",
    text: "Sauvegardez le vocabulaire pour réviser à tout moment. / Save vocabulary to review anytime.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: TrendingUp,
    label: "AI Assistant",
    text: "L'IA mémorisera votre niveau et style d'apprentissage. / AI will remember your level and learning style.",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
] as const

export function SyncSaveModal({ open, onOpenChange }: SyncSaveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-none bg-gradient-to-b from-white via-white to-slate-50 p-0 shadow-2xl sm:max-w-[440px]">
        <div className="relative overflow-hidden rounded-t-[28px] bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 pb-8 pt-10">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />

          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold tracking-tight text-primary-foreground">
              Gardez votre progression !
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-primary-foreground/90">
              Save your learning journey!
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 pt-5 pb-2">
          {benefits.map((b) => (
            <div
              key={b.label}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-200"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${b.bg}`}>
                <b.icon className={`h-4.5 w-4.5 ${b.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{b.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 px-6 pb-6 pt-3">
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              MemoMap est 100% gratuit. La connexion sert uniquement à sécuriser vos données.
              <br />
              <span className="text-slate-400">
                MemoMap is 100% free. Logging in is only used to secure your data.
              </span>
            </p>
          </div>

          <LoginButton
            size="lg"
            className="h-12 w-full rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Se connecter avec Google
          </LoginButton>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-2 text-center text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Continuer en mode invité
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
