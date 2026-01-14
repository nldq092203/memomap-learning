"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const Motion = { div: motion.div }

type UserLevel = "beginner" | "intermediate"
type DailyGoal = 15 | 30 | 60

interface SetupStepProps {
  onNext: (level: UserLevel, dailyGoal: DailyGoal) => void
  onBack: () => void
}

export function SetupStep({ onNext, onBack }: SetupStepProps) {
  const [level, setLevel] = useState<UserLevel>("beginner")
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(30)

  const handleContinue = () => {
    onNext(level, dailyGoal)
  }

  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Step 2 of 3</p>
        <h2 className="text-3xl md:text-4xl font-bold">Quick Setup</h2>
        <p className="text-muted-foreground">
          Help us personalize your learning experience
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Level Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">What's your current French level?</label>
            <div className="grid gap-3">
              {[
                { value: "beginner" as const, label: "Advanced Beginner (A2)", desc: "Consolidating foundations" },
                { value: "intermediate" as const, label: "Intermediate (B1-B2)", desc: "Focusing on fluency and complexity" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLevel(option.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                    level === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                      level === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {level === option.value && (
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Goal Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Daily learning goal</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 15 as const, label: "15 min", desc: "Light" },
                { value: 30 as const, label: "30 min", desc: "Regular" },
                { value: 60 as const, label: "60 min", desc: "Intensive" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDailyGoal(option.value)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-all",
                    dailyGoal === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <p className="text-2xl font-bold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              You can change this anytime in settings
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          className="gap-2 px-8 rounded-full"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Motion.div>
  )
}
