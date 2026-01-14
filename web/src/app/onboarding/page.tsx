"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboarding } from "@/lib/contexts/onboarding-context"
import { WelcomeStep } from "@/components/onboarding/welcome-step"
import { SetupStep } from "@/components/onboarding/setup-step"
import { FirstActionStep } from "@/components/onboarding/first-action-step"
import { Progress } from "@/components/ui/progress"

type OnboardingStep = "welcome" | "setup" | "first-action"

export default function OnboardingPage() {
  const router = useRouter()
  const { setPreferences, completeOnboarding } = useOnboarding()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [tempPreferences, setTempPreferences] = useState<{
    level?: "beginner" | "intermediate" | "advanced"
    dailyGoal?: 15 | 30 | 60
  }>({})

  const handleWelcomeNext = () => {
    setCurrentStep("setup")
  }

  const handleSetupNext = (
    level: "beginner" | "intermediate" | "advanced",
    dailyGoal: 15 | 30 | 60
  ) => {
    setTempPreferences({ level, dailyGoal })
    setPreferences({ level, dailyGoal })
    setCurrentStep("first-action")
  }

  const handleStartLearning = () => {
    completeOnboarding()
    router.push("/learning/workspace")
  }

  const handleSkip = () => {
    completeOnboarding()
    router.push("/learning")
  }

  const handleBack = () => {
    if (currentStep === "setup") {
      setCurrentStep("welcome")
    } else if (currentStep === "first-action") {
      setCurrentStep("setup")
    }
  }

  const getProgress = () => {
    switch (currentStep) {
      case "welcome":
        return 0
      case "setup":
        return 50
      case "first-action":
        return 100
      default:
        return 0
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Progress Bar */}
        {currentStep !== "welcome" && (
          <div className="space-y-2">
            <Progress value={getProgress()} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {currentStep === "setup" && "Step 2 of 3"}
              {currentStep === "first-action" && "Step 3 of 3"}
            </p>
          </div>
        )}

        {/* Step Content */}
        {currentStep === "welcome" && <WelcomeStep onNext={handleWelcomeNext} />}
        {currentStep === "setup" && (
          <SetupStep onNext={handleSetupNext} onBack={handleBack} />
        )}
        {currentStep === "first-action" && (
          <FirstActionStep
            onStartLearning={handleStartLearning}
            onSkip={handleSkip}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
