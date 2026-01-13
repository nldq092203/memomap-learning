"use client"

import { useEffect } from "react"
import { useSpeakingPractice } from "@/lib/hooks/use-speaking-practice"
import {
  TopicList,
  SubtopicList,
  PracticePlayer,
} from "@/components/learning/speaking-practice"

export default function SpeakingPracticePage() {
  const {
    topics,
    currentTopic,
    currentContent,
    currentItemIndex,
    loading,
    loadTopics,
    loadTopicManifest,
    loadContent,
    nextItem,
    previousItem,
    goToItem,
    backToTopics,
    backToSubtopics,
  } = useSpeakingPractice()

  // Load topics on mount
  useEffect(() => {
    if (topics.length === 0 && !currentTopic) {
      void loadTopics()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle topic selection
  const handleTopicSelect = (topicId: string) => {
    void loadTopicManifest(topicId)
  }

  // Handle subtopic selection
  const handleSubtopicSelect = (contentPath: string) => {
    void loadContent(contentPath)
  }

  // Render topic selection
  if (!currentTopic && !currentContent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <TopicList
            topics={topics}
            loading={loading}
            onSelectTopic={handleTopicSelect}
          />
        </div>
      </div>
    )
  }

  // Render subtopic selection
  if (currentTopic && !currentContent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <SubtopicList
            topic={currentTopic}
            loading={loading}
            onSelectSubtopic={handleSubtopicSelect}
            onBack={backToTopics}
          />
        </div>
      </div>
    )
  }

  // Render practice session
  if (currentContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
          <PracticePlayer
            content={currentContent}
            currentItemIndex={currentItemIndex}
            onNext={nextItem}
            onPrevious={previousItem}
            onGoToItem={goToItem}
            onBack={backToSubtopics}
          />
        </div>
      </div>
    )
  }

  return null
}
