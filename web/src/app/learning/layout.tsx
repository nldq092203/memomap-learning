"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { SettingsProvider } from "@/lib/contexts/settings-context"
import { AiAssistantLauncher } from "@/components/learning/ai/ai-assistant-launcher"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { notificationService } from "@/lib/services/notification-service"
import { usePathname } from "next/navigation"
import { LearningTimeSessionProvider } from "@/lib/contexts/learning-time-session-context"
import { LearningSessionTimer } from "@/components/learning/layout/learning-session-timer"
import { GlobalLearningShortcuts } from "@/components/learning/layout/global-learning-shortcuts"

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Bridge component so we can consume context after the provider mounts
  function AssistantBridge() {
    const { lang } = useLearningLang()
    const handleAddVocabCard = async (cardData: {
      word: string
      translation: string | null
      notes: string[]
      tags: string[]
    }) => {
      const trimmedWord = cardData.word.trim()
      if (!trimmedWord) {
        notificationService.error("Word is required")
        return Promise.reject(new Error("Word is required"))
      }
      try {
        await learningVocabApi.bulkImport(lang, [
          {
            word: trimmedWord,
            translation: cardData.translation?.trim() || null,
            notes: cardData.notes,
            tags: cardData.tags,
          },
        ])
        notificationService.success("Added to vocabulary ✨")
        // Return a mock LocalVocabCard since we're using the API
        return {
          id: `vocab_${Date.now()}`,
          sessionId: '',
          word: trimmedWord,
          translation: cardData.translation,
          notes: cardData.notes,
          tags: cardData.tags,
          language: lang,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      } catch (error) {
        console.error("Failed to add vocabulary card from AI", error)
        notificationService.error("Failed to add vocabulary card")
        return Promise.reject(error)
      }
    }
    return (
      <AiAssistantLauncher
        learningLang={lang}
        nativeLang="vi"
        contextText=""
        addVocabCard={handleAddVocabCard}
      />
    )
  }
  return (
    <ProtectedRoute>
      <SettingsProvider>
        <LearningTimeSessionProvider>
          <GlobalLearningShortcuts />
          <div className="min-h-[calc(100vh-56px)]">
            <main className="bg-muted/20">
              {children}
            </main>
            {/* Global learning time session timer for all learning activities */}
            <LearningSessionTimer />
            {/* Floating AI assistant available on most learning pages (language-aware) */}
            {!pathname.includes("/learning/session/") && <AssistantBridge />}
          </div>
        </LearningTimeSessionProvider>
      </SettingsProvider>
    </ProtectedRoute>
  )
}
