export interface LocalVocabCard {
  id: string
  sessionId: string
  entryId?: string
  word: string
  translation: string | null
  notes: string[]
  tags: string[]
  language: string
  createdAt: string
  updatedAt: string
}
