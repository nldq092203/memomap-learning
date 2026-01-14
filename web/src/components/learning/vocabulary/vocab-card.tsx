"use client"

import { useState } from "react"
import { LearningVocabCard } from "@/lib/types/learning-vocab"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Volume2,
  Pencil,
  Trash2,
  MoreVertical
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface VocabCardProps {
  card: LearningVocabCard
  selected?: boolean
  onSelect?: (checked: boolean) => void
  onEdit: (card: LearningVocabCard) => void
  onDelete: (card: LearningVocabCard) => void
  onPlayAudio: (text: string) => void
  viewMode?: "list" | "grid"
}

export function VocabCard({
  card,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onPlayAudio,
  viewMode = "list",
}: VocabCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Extract Part of Speech (POS) from tags if available
  // Common POS to look for: verb, noun, adj, adv, idiom, phrase
  const posTag = card.tags?.find(t => 
    ["verb", "noun", "adj", "adjective", "adv", "adverb", "idiom", "expression", "phrase"].includes(t.toLowerCase())
  )

  // Determine mastery level (1-5 dots) based on ease/streak
  // Logic: 
  // New = 0
  // Learning = 1-3 based on streak
  // Review/Mastered = 4-5 based on ease
  const getMasteryLevel = () => {
    if (card.status === "new") return 0
    if (card.status === "learning") {
      return Math.min(3, Math.max(1, card.streak_correct))
    }
    // Review status
    if (card.ease > 2.5) return 5
    return 4
  }

  const masteryLevel = getMasteryLevel()

  // Helper to render mastery dots
  const MasteryIndicator = () => (
    <div className="flex gap-0.5" title={`Mastery Level: ${masteryLevel}/5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            level <= masteryLevel
              ? level >= 4 
                ? "bg-emerald-500" 
                : level >= 2 
                  ? "bg-yellow-500" 
                  : "bg-orange-500"
              : "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  )

  if (viewMode === "grid") {
    // Grid (Flashcard) View Implementation
    return (
      <Card 
        className={cn(
          "relative flex flex-col p-5 group transition-all duration-200 hover:shadow-md border-border/60",
          selected && "border-primary ring-1 ring-primary bg-primary/5"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute top-4 left-4 z-10">
           <Checkbox 
            checked={selected}
            onCheckedChange={(c) => onSelect?.(!!c)}
            className={cn(
              "transition-opacity duration-200 data-[state=checked]:opacity-100",
              selected || isHovered ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(card)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(card)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 flex flex-col items-center text-center justify-center space-y-4 py-4">
          <div className="space-y-1">
             <div className="flex items-center justify-center gap-2">
               <h3 className="text-xl font-bold text-foreground">{card.word}</h3>
               <button 
                  onClick={() => onPlayAudio(card.word)}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-primary/10"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
             </div>
             {posTag && (
                <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground font-normal">
                  {posTag.toUpperCase()}
                </Badge>
             )}
          </div>

          <div className="w-8 h-px bg-border/60" />

          <div className="space-y-2">
            <p className="font-medium text-foreground/90 flex items-center justify-center gap-1.5">
               {card.translation}
            </p>
            {card.notes?.[0] && (
               <p className="text-xs text-muted-foreground italic line-clamp-2 px-2">
                 "{card.notes[0]}"
               </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-center">
           <MasteryIndicator />
        </div>
      </Card>
    )
  }

  // LIST VIEW IMPLEMENTATION (Rich Row)
  return (
    <div 
      className={cn(
        "group relative grid grid-cols-[auto_25%_1fr_auto] gap-4 items-center p-4 rounded-xl transition-all duration-200 hover:bg-muted/40 border border-transparent hover:border-border/40",
        selected && "bg-primary/5 border-primary/20 hover:bg-primary/10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Checkbox Column */}
      <div className="flex items-center justify-center pl-1">
         <Checkbox 
            checked={selected}
            onCheckedChange={(c) => onSelect?.(!!c)}
            className={cn(
               "transition-all duration-200",
               selected || isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
            )}
         />
      </div>

      {/* 2. Term Column (25%) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground">{card.word}</h3>
          <button
             onClick={() => onPlayAudio(card.word)}
             className="text-muted-foreground hover:text-primary transition-colors p-1"
             aria-label="Play pronunciation"
          >
             <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
           {posTag && (
             <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase font-medium bg-muted/60 text-muted-foreground border-transparent">
               {posTag}
             </Badge>
           )}
           <MasteryIndicator />
        </div>
      </div>

      {/* 3. Meaning/Context Column (60%) */}
      <div className="space-y-1.5 border-l border-border/40 pl-4 min-w-0">
         <div className="flex items-center gap-2">
            {/* Optional: Add flag based on content language detection if needed in future */}
            {/* <Languages className="h-3 w-3 text-muted-foreground/60" /> */}
            <span className="font-medium text-foreground">{card.translation || "No translation"}</span>
         </div>
         {card.notes?.[0] && (
            <p className="text-sm text-muted-foreground/80 italic truncate pr-4">
              <span className="opacity-60 text-xs not-italic mr-1.5 font-semibold uppercase tracking-wider">Ex</span> 
              {card.notes[0]}
            </p>
         )}
      </div>

      {/* 4. Actions Column (15% visual weight, auto width) */}
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => onEdit(card)}
            title="Edit card"
         >
            <Pencil className="h-4 w-4" />
         </Button>
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(card)}
            title="Delete card"
         >
            <Trash2 className="h-4 w-4" />
         </Button>
      </div>
    </div>
  )
}
