"use client"

import { useState, useCallback } from "react"
import { learningSpeakingApi } from "@/lib/services/learning-speaking-api"
import type {
  SpeakingTopic,
  SpeakingTopicManifest,
  SpeakingPracticeContent,
} from "@/lib/types/api/speaking-practice"
import { notificationService } from "@/lib/services/notification-service"

export function useSpeakingPractice() {
  const [topics, setTopics] = useState<SpeakingTopic[]>([])
  const [currentTopic, setCurrentTopic] = useState<SpeakingTopicManifest | null>(null)
  const [currentContent, setCurrentContent] = useState<SpeakingPracticeContent | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load all topics
  const loadTopics = useCallback(async () => {
    setLoading(true)
    try {
      const data = await learningSpeakingApi.listTopics()
      setTopics(data)
    } catch (error) {
      console.error("Failed to load topics:", error)
      notificationService.error("Failed to load speaking practice topics")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load topic manifest with subtopics
  const loadTopicManifest = useCallback(async (topicId: string) => {
    setLoading(true)
    try {
      const data = await learningSpeakingApi.getTopicManifest(topicId)
      setCurrentTopic(data)
      setCurrentContent(null)
      setCurrentItemIndex(0)
    } catch (error) {
      console.error("Failed to load topic manifest:", error)
      notificationService.error("Failed to load topic details")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load practice content
  const loadContent = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const data = await learningSpeakingApi.getContent(path)
      setCurrentContent(data)
      setCurrentItemIndex(0)
    } catch (error) {
      console.error("Failed to load content:", error)
      notificationService.error("Failed to load practice content")
    } finally {
      setLoading(false)
    }
  }, [])

  // Navigate to next item
  const nextItem = useCallback(() => {
    if (!currentContent) return
    if (currentItemIndex < currentContent.items.length - 1) {
      setCurrentItemIndex((prev) => prev + 1)
    }
  }, [currentContent, currentItemIndex])

  // Navigate to previous item
  const previousItem = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1)
    }
  }, [currentItemIndex])

  // Go to specific item
  const goToItem = useCallback((index: number) => {
    if (!currentContent) return
    if (index >= 0 && index < currentContent.items.length) {
      setCurrentItemIndex(index)
    }
  }, [currentContent])

  // Reset to topic selection
  const reset = useCallback(() => {
    setCurrentTopic(null)
    setCurrentContent(null)
    setCurrentItemIndex(0)
  }, [])

  // Back to topics
  const backToTopics = useCallback(() => {
    reset()
  }, [reset])

  // Back to subtopics
  const backToSubtopics = useCallback(() => {
    setCurrentContent(null)
    setCurrentItemIndex(0)
  }, [])

  return {
    // State
    topics,
    currentTopic,
    currentContent,
    currentItemIndex,
    loading,

    // Computed
    currentItem: currentContent?.items[currentItemIndex] || null,
    hasNext: currentContent ? currentItemIndex < currentContent.items.length - 1 : false,
    hasPrevious: currentItemIndex > 0,
    totalItems: currentContent?.items.length || 0,

    // Actions
    loadTopics,
    loadTopicManifest,
    loadContent,
    nextItem,
    previousItem,
    goToItem,
    reset,
    backToTopics,
    backToSubtopics,
  }
}
