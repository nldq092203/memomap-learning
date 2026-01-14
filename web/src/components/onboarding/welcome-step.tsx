"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, BookOpen, Mic, Target } from "lucide-react"
import { motion } from "framer-motion"

const Motion = { div: motion.div, h1: motion.h1, p: motion.p }

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center space-y-4">
        <Motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl md:text-5xl font-bold"
        >
          👋 Bienvenue sur MemoMap!
        </Motion.h1>
        <Motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
        >
          Learn French through smart, engaging activities designed to help you progress faster.
        </Motion.p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6 md:p-8 space-y-4">
          <p className="text-sm font-medium text-primary mb-4">What you'll get:</p>
          
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">🎯 Smart vocabulary review</p>
                <p className="text-sm text-muted-foreground">
                  Spaced repetition system that helps you remember words long-term
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">🗣️ Speaking practice</p>
                <p className="text-sm text-muted-foreground">
                  Practice pronunciation with structured conversations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">📝 Interactive exercises</p>
                <p className="text-sm text-muted-foreground">
                  Dictation, numbers, and custom training activities
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={onNext}
          className="gap-2 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:from-emerald-600 hover:to-teal-600"
        >
          Let's Start! <Sparkles className="h-4 w-4" />
        </Button>
      </div>
    </Motion.div>
  )
}
