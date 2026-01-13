import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoId = (len = 16) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36])
    .join("");

export const nowMs = () => Date.now()

export const genId = () => {
  // 21-char hex-ish ID (passes zod: min 10, max 32)
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
  return hex.slice(0, 21)
}

export const slugify = (s: string, max = 128) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, max)

export const ymdToEpoch = (yyyyMmDd?: string) => {
  if (!yyyyMmDd) return undefined
  // Interpret as local date at 00:00
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d).getTime()
}

export const isBrowser = () =>
  typeof window !== "undefined" && typeof document !== "undefined"
