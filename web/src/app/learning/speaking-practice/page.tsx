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

  const shellClassName = currentContent
    ? "min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef8f3_100%)]"
    : "min-h-screen bg-slate-50"

  return (
    <div className={shellClassName}>
      <div className={currentContent ? "mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8" : "mx-auto max-w-6xl px-4 py-6 md:py-8"}>
        <Button
          type="button"
          variant="ghost"
          className="mb-6 rounded-full px-3 text-slate-600 hover:bg-white hover:text-slate-900"
          onClick={() => router.push("/learning/workspace")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à l&apos;espace d&apos;entrainement
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
