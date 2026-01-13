"use client"

import type { LearningAnalytics } from "@/lib/types/learning-vocab"

const KEY = "learning_analytics_cache_v1"
const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

type CacheMap = Record<string, { data: LearningAnalytics; ts: number }>

function readStore(): CacheMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CacheMap
  } catch {
    return {}
  }
}

function writeStore(map: CacheMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore quota issues
  }
}

export const analyticsCache = {
  get(language: string): LearningAnalytics | null {
    const map = readStore()
    const entry = map[language]
    if (!entry) return null
    if (Date.now() - entry.ts > TTL_MS) return null
    return entry.data
  },
  set(language: string, data: LearningAnalytics) {
    const map = readStore()
    map[language] = { data, ts: Date.now() }
    writeStore(map)
  },
  clear(language?: string) {
    if (!language) {
      writeStore({})
      return
    }
    const map = readStore()
    delete map[language]
    writeStore(map)
  }
}

