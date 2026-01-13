"use client"

import React from "react"
import type { LearningVocabCard } from "@/lib/types/learning-vocab"
import { UsageChallenge } from "@/components/learning/review/usage-challenge"

export type ReviewChallengeId = "usage_sentence"

export interface ReviewChallengeDefinition {
  id: ReviewChallengeId
  label: string
  description: string
  Component: (props: { card: LearningVocabCard; language: string }) => React.ReactElement
}

export const REVIEW_CHALLENGES: ReviewChallengeDefinition[] = [
  {
    id: "usage_sentence",
    label: "Sentence",
    description: "Write a sentence using the word",
    Component: UsageChallenge,
  },
]

