"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Layers,
  Mic,
  Target,
  MessageSquare,
  Hash,
  FileText,
  Type,
  Timer,
  Sparkles,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const Motion = { div: motion.div }

interface FeatureGuideModalProps {
  open: boolean
  onClose: () => void
}

const features = [
  {
    icon: Target,
    title: "Révision (Review Hub)",
    desc: "Révisez votre vocabulaire avec la répétition espacée — un algorithme qui optimise votre mémorisation.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BookOpen,
    title: "Vocabulaire",
    desc: "Parcourez, ajoutez et organisez vos cartes de vocabulaire avec des notes et des tags.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Layers,
    title: "Entraînement (Workspace)",
    desc: "Pratiquez la dictée, les exercices interactifs et les activités guidées.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    children: [
      {
        icon: Type,
        title: "Dictée",
        desc: "Écoutez ou lisez un contenu puis retapez-le pour améliorer l'écoute et l'orthographe.",
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
      },
      {
        icon: FileText,
        title: "DELF Practice",
        desc: "Entraînez-vous avec des exercices de compréhension et production pour le DELF.",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        icon: FileText,
        title: "CO/CE Practice",
        desc: "Travaillez la compréhension orale et écrite avec des exercices guidés.",
        color: "text-sky-500",
        bg: "bg-sky-500/10",
      },
      {
        icon: MessageSquare,
        title: "Pratique orale",
        desc: "Pratiquez votre expression orale avec des conversations structurées.",
        color: "text-cyan-500",
        bg: "bg-cyan-500/10",
      },
      {
        icon: Hash,
        title: "Dictée de nombres",
        desc: "Améliorez votre compréhension des nombres français avec des exercices audio.",
        color: "text-orange-500",
        bg: "bg-orange-500/10",
      },
    ],
  },
  {
    icon: Mic,
    title: "Transcrire",
    desc: "Enregistrez ou uploadez de l'audio et générez des transcriptions pour étudier.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
]

const tips = [
  {
    icon: Timer,
    title: "Sessions chronométrées",
    desc: "Chronométrez vos études. Le temps s'enregistre automatiquement entre les pages.",
  },
  {
    icon: Sparkles,
    title: "Assistant IA",
    desc: "Posez vos questions ou ajoutez du vocabulaire via le bouton flottant.",
  },
  {
    icon: Keyboard,
    title: "Raccourcis clavier",
    desc: "Naviguez plus vite. Consultez la liste complète dans le Shortcuts.",
  },
]

export function FeatureGuideModal({ open, onClose }: FeatureGuideModalProps) {
  const [step, setStep] = useState(0)

  if (!open) return null

  const totalSteps = 2

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-2xl rounded-2xl border bg-background shadow-xl max-h-[85vh] overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <h2 className="text-xl font-semibold">
                {step === 0 ? "📚 Fonctionnalités" : "💡 Outils & astuces"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step === 0
                  ? "Découvrez les outils disponibles pour apprendre le français"
                  : "Des conseils pour optimiser votre apprentissage"}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 px-6 pb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <Motion.div
                  key="features"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-3"
                >
                  {features.map((f) => (
                    <div key={f.title} className="space-y-2">
                      <div className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
                        <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", f.bg, f.color)}>
                          <f.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{f.title}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>

                      {"children" in f && Array.isArray(f.children) && f.children.length > 0 && (
                        <div className="ml-6 space-y-2 border-l border-border pl-6">
                          {f.children.map((child) => (
                            <div
                              key={child.title}
                              className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  child.bg,
                                  child.color,
                                )}
                              >
                                <child.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{child.title}</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                  {child.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </Motion.div>
              )}

              {step === 1 && (
                <Motion.div
                  key="tips"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-4"
                >
                  {tips.map((t) => (
                    <div key={t.title} className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <t.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="flex items-center justify-between border-t px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Précédent
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                className="gap-1 rounded-full px-5"
              >
                Suivant <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onClose}
                className="gap-1 rounded-full px-5"
              >
                Compris ! <Sparkles className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </Motion.div>
      </div>
    </Motion.div>
  )
}
