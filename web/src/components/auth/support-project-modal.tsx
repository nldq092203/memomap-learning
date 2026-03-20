"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SupportProjectVietQrCard } from "@/components/auth/support-project-vietqr-card"
import { SUPPORT_PROJECT_COPY } from "@/components/auth/support-project-modal.constants"

interface SupportProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupportProjectModal({
  open,
  onOpenChange,
}: SupportProjectModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-900/45 backdrop-blur-md data-[state=closed]:duration-200 data-[state=open]:duration-300"
        className="box-border w-[calc(100vw-1rem)] max-w-[420px] max-h-[calc(100vh-1rem)] gap-0 overflow-x-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-0 text-slate-800 shadow-[0_40px_90px_-48px_rgba(15,23,42,0.6)] duration-300 sm:w-full sm:max-h-[min(720px,calc(100vh-2rem))]"
      >
        <div className="relative overflow-x-hidden bg-gradient-to-b from-white via-slate-50/70 to-teal-50/45 px-4 py-4 sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-20 rounded-full bg-teal-100/40 blur-3xl" />

          <div className="relative space-y-3.5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-[1.7rem] font-bold tracking-tight text-slate-900 sm:text-[1.9rem]">
                {SUPPORT_PROJECT_COPY.title}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-teal-600">
                {SUPPORT_PROJECT_COPY.subtitle}
              </DialogDescription>
            </DialogHeader>

            <p className="max-w-none text-sm leading-6 text-slate-600 sm:max-w-[22rem]">
              {SUPPORT_PROJECT_COPY.message}
            </p>

            <SupportProjectVietQrCard />

            <p className="text-center text-xs italic text-slate-500">
              {SUPPORT_PROJECT_COPY.footer}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
