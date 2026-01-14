"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const Motion = { div: motion.div }

interface FirstActionStepProps {
  onStartLearning: () => void
  onSkip: () => void
  onBack: () => void
}

export function FirstActionStep({ onStartLearning, onSkip, onBack }: FirstActionStepProps) {
  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Step 3 of 3</p>
        <h2 className="text-3xl md:text-4xl font-bold">🎉 You're All Set!</h2>
        <p className="text-muted-foreground">
          Ready to start your French learning journey?
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6 md:p-8 space-y-6 text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Recommended first step
            </div>
            <h3 className="text-2xl font-semibold">Let's explore the Training workspace!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start with interactive exercises and speaking practice. You can add vocabulary as you learn.
              This takes about 2 minutes to explore.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={onStartLearning}
              className="gap-2 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:from-emerald-600 hover:to-teal-600 w-full sm:w-auto"
            >
              Start Learning <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full sm:w-auto"
            >
              Skip for now
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            ⏱️ Estimated time: 2 minutes
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </Motion.div>
  )
}
