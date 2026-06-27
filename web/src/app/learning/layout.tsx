"use client"

import { SettingsProvider } from "@/lib/contexts/settings-context"
import { AiAssistantLauncher } from "@/components/learning/ai/ai-assistant-launcher"
import { useLearningLang } from "@/lib/contexts/learning-lang-context"
import { learningVocabApi } from "@/lib/services/learning-vocab-api"
import { notificationService } from "@/lib/services/notification-service"
import { usePathname } from "next/navigation"
import { GlobalLearningShortcuts } from "@/components/learning/layout/global-learning-shortcuts"
import { useGuest } from "@/lib/contexts/guest-context"
import { LoginPromptModal } from "@/components/auth/login-prompt-modal"
import { useAuth } from "@/lib/contexts/auth-context"

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LearningLayoutInner>{children}</LearningLayoutInner>
  )
}

function LearningLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { showLoginPrompt, setShowLoginPrompt } = useGuest()

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
    <SettingsProvider>
      <GlobalLearningShortcuts />
      <div className="min-h-[calc(100vh-56px)]">
        <main className="bg-muted/20">
          {children}
        </main>
        {isAuthenticated && !pathname.includes("/learning/session/") && <AssistantBridge />}
      </div>
      <LoginPromptModal open={showLoginPrompt} onOpenChange={setShowLoginPrompt} />
    </SettingsProvider>
  )
}
