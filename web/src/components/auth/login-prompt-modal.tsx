"use client"

import { LogIn } from "lucide-react"

import { LoginButton } from "@/components/auth/login-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LoginPromptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginPromptModal({ open, onOpenChange }: LoginPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)] text-[var(--vintage-ink)] sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--vintage-cream)] text-[var(--vintage-desert-rock)]">
            <LogIn className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl">Connectez-vous</DialogTitle>
          <DialogDescription className="text-[var(--vintage-muted-ink)]">
            Votre compte permet d&apos;accéder à cette section et de garder votre progression.
          </DialogDescription>
        </DialogHeader>

        <LoginButton className="mt-2 h-11 rounded-full bg-[var(--vintage-desert-rock)] px-6 text-[var(--vintage-feather-white)] hover:bg-[#8f7763]">
          Se connecter avec Google
        </LoginButton>
      </DialogContent>
    </Dialog>
  )
}
