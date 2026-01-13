// Speaking Practice API Types

// Topic metadata
export interface SpeakingTopic {
  id: string
  title: string
  subtopics_count: number
}

// Subtopic metadata
export interface SpeakingSubtopic {
  id: string
  title: string
  contentPath: string
}

// Topic manifest with subtopics
export interface SpeakingTopicManifest {
  topic: string
  title: string
  subtopics: SpeakingSubtopic[]
}

// Individual practice item
export interface SpeakingPracticeItem {
  id: string
  t: string // text content
  s?: number // speak time in seconds (for questions)
  audio: string // relative path to audio file
}

// Complete practice content
export interface SpeakingPracticeContent {
  id: string
  lang: string
  topic: string
  items: SpeakingPracticeItem[]
}

// API responses
export interface SpeakingTopicsResponse {
  topics: SpeakingTopic[]
}

export interface SpeakingTopicManifestResponse {
  topic: string
  title: string
  subtopics: SpeakingSubtopic[]
}

export interface SpeakingContentResponse {
  id: string
  lang: string
  topic: string
  items: SpeakingPracticeItem[]
}
