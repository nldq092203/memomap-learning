export type ReviewGrade = "again" | "hard" | "good" | "easy"

export interface ReviewStats {
  status: "new" | "learning" | "review" | "suspended"
  due_at: string | null
  last_reviewed_at: string | null
  interval_days: number
  ease: number
  reps: number
  lapses: number
  streak_correct: number
  last_grade: ReviewGrade | null
}

export interface LearningVocabCard {
  id: string
  type: "vocabulary_card"
  language: string
  word: string
  translation: string | null
  notes: string[]
  tags: string[]
  review_stats: ReviewStats
  created_at: string
  updated_at: string
}

export interface VocabListResponse {
  items: LearningVocabCard[]
  total: number
  limit: number
  offset: number
}

export interface VocabStats {
  total_cards: number
  cards_by_level: {
    [level: string]: number
  }
  due_today: number
  reviewed_today: number
  // Backwards compatibility
  total?: number
  new?: number
  learning?: number
  review?: number
  suspended?: number
  due?: number
  overdue?: number
}

export interface DailyAnalytics {
  date: string
  minutes: number
  sessions: number
}

export interface LearningAnalytics {
  today_minutes: number
  avg_minutes_7d: number
  avg_minutes_30d: number
  current_streak_days: number
  longest_streak_days: number
  daily: DailyAnalytics[]
}


