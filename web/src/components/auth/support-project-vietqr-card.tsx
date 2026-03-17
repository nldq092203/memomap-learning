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
    <section className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Scan to support</p>
        <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {new Intl.NumberFormat("vi-VN").format(SUPPORT_CONFIG.defaultAmount)} VND
        </div>
      </div>

      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-2">
        <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
          <Image
            src={getVietQRUrl()}
            alt="MemoMap VietQR donation code"
            width={260}
            height={260}
            className="h-auto w-full"
            unoptimized
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        <p
          className="flex select-none items-center gap-1 text-[10px] font-semibold tracking-[0.34em] text-slate-800"
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
          className="h-8 rounded-full border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-none hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <Clipboard className="size-3.5" />
          Copy Account Number
        </Button>
      </div>
    </section>
  )
}
