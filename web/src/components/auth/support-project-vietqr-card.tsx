"use client"

import { Button } from "@/components/ui/button"
import { notificationService } from "@/lib/services/notification-service"
import { Clipboard } from "lucide-react"
import Image from "next/image"
import {
  getVietQRUrl,
  SUPPORT_CONFIG,
  SUPPORT_PROJECT_BANK,
} from "@/components/auth/support-project-modal.constants"

const BANK_NAME_GLYPHS = SUPPORT_PROJECT_BANK.bankName.split("")

export function SupportProjectVietQrCard() {
  const handleCopy = async () => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard unavailable")
      }

      await navigator.clipboard.writeText(SUPPORT_PROJECT_BANK.accountNumber)
      notificationService.success("Account number copied")
    } catch {
      notificationService.error("Unable to copy account number")
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-900">Scan to support</p>
        <div className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {new Intl.NumberFormat("vi-VN").format(SUPPORT_CONFIG.defaultAmount)} VND
        </div>
      </div>

      <div className="min-w-0 rounded-[16px] border border-slate-200 bg-slate-50 p-2">
        <div className="aspect-square w-full overflow-hidden rounded-[16px] border border-slate-200 bg-white">
          <Image
            src={getVietQRUrl()}
            alt="MemoMap VietQR donation code"
            width={260}
            height={260}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-col items-center gap-2">
        <p
          className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 break-all text-center text-[10px] font-semibold tracking-[0.22em] text-slate-800 sm:tracking-[0.34em]"
          aria-label={SUPPORT_PROJECT_BANK.bankName}
        >
          <span className="sr-only">{SUPPORT_PROJECT_BANK.bankName}</span>
          {BANK_NAME_GLYPHS.map((glyph, index) => (
            <span key={`${glyph}-${index}`} aria-hidden="true">
              {glyph}
            </span>
          ))}
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="h-8 w-full max-w-full rounded-full border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-none hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 sm:w-auto"
        >
          <Clipboard className="size-3.5" />
          Copy Account Number
        </Button>
      </div>
    </section>
  )
}
