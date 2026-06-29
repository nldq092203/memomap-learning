"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGuest } from "@/lib/contexts/guest-context"
import { useSpeakingPractice } from "@/lib/hooks/use-speaking-practice"
import {
  TopicList,
  SubtopicList,
  PracticePlayer,
} from "@/components/learning/speaking-practice"

export default function SpeakingPracticePage() {
  const router = useRouter()
  const { isGuest } = useGuest()
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

  useEffect(() => {
    if (topics.length === 0 && !currentTopic) {
      void loadTopics(isGuest)
    }
  }, [currentTopic, isGuest, loadTopics, topics.length])

  const handleTopicSelect = (topicId: string) => {
    void loadTopicManifest(topicId, isGuest)
  }

  const handleSubtopicSelect = (contentPath: string) => {
    void loadContent(contentPath, isGuest)
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f5eee5] text-[var(--vintage-ink)]"
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(245,238,229,0.93), rgba(245,238,229,0.98)), url('/UI/map.webp')",
        backgroundPosition: "center top",
        backgroundSize: "cover",
      }}
    >
      <div className={currentContent ? "mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8" : "mx-auto max-w-6xl px-4 py-6 md:py-8"}>
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-[var(--vintage-muted-ink)] hover:bg-[var(--vintage-feather-white)] hover:text-[var(--vintage-ink)]"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>

        {!currentTopic && !currentContent && (
          <TopicList
            topics={topics}
            loading={loading}
            onSelectTopic={handleTopicSelect}
          />
        )}

        {currentTopic && !currentContent && (
          <SubtopicList
            topic={currentTopic}
            loading={loading}
            onSelectSubtopic={handleSubtopicSelect}
            onBack={backToTopics}
          />
        )}

        {currentContent && (
          <PracticePlayer
            content={currentContent}
            currentItemIndex={currentItemIndex}
            onNext={nextItem}
            onPrevious={previousItem}
            onGoToItem={goToItem}
            onBack={backToSubtopics}
          />
        )}
      </div>
    </div>
  )
}
