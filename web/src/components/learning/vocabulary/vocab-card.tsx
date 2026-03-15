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
  const getMasteryMeta = () => {
    if (card.status === "new") {
      return {
        label: "Nouveau",
        progress: 12,
        badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
        progressClass: "bg-slate-400",
      }
    }
    if (card.status === "learning") {
      return {
        label: "En apprentissage",
        progress: Math.min(68, Math.max(28, 24 + card.streak_correct * 12)),
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        progressClass: "bg-amber-400",
      }
    }
    return {
      label: "Maîtrisé",
      progress: card.ease > 2.5 ? 96 : 82,
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      progressClass: "bg-emerald-400",
    }
  }

  const masteryMeta = getMasteryMeta()

  const statusBadge = (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full border px-2.5 text-[11px] font-medium shadow-sm",
        masteryMeta.badgeClass
      )}
    >
      {masteryMeta.label}
    </Badge>
  )

  const masteryProgress = (
    <div className="w-full max-w-[120px]">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>Progression</span>
        <span>{masteryMeta.progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", masteryMeta.progressClass)}
          style={{ width: `${masteryMeta.progress}%` }}
        />
      </div>
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
                <Pencil className="h-4 w-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(card)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 flex flex-col items-center text-center justify-center space-y-4 py-4">
          <div className="space-y-1">
             <div className="flex items-center justify-center gap-2">
               <h3 className="text-2xl font-semibold text-slate-900">{card.word}</h3>
               <button 
                  onClick={() => onPlayAudio(card.word)}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-primary/10"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
             </div>
             <div className="flex items-center justify-center gap-2">
	               {posTag && (
	                  <Badge variant="secondary" className="h-5 bg-muted/50 px-2 text-[10px] font-normal text-muted-foreground">
	                    {posTag.toUpperCase()}
	                  </Badge>
	               )}
	               {statusBadge}
	             </div>
	          </div>

          <div className="w-8 h-px bg-border/60" />

          <div className="space-y-2">
            <p className="flex items-center justify-center gap-1.5 text-base font-medium text-slate-700">
               {card.translation}
            </p>
            {card.notes?.[0] && (
              <div className="mx-2 rounded-xl border-l-2 border-primary/25 bg-slate-50/80 px-3 py-2">
                <p className="line-clamp-2 text-xs italic text-slate-500">
                  {card.notes[0]}
                </p>
              </div>
            )}
          </div>
	        </div>

	        <div className="mt-auto flex items-center justify-center pt-4">
	          {masteryProgress}
	        </div>
	      </Card>
    )
  }

  // LIST VIEW IMPLEMENTATION (Rich Row)
  return (
    <div 
      className={cn(
        "group relative grid grid-cols-[auto_minmax(220px,0.9fr)_minmax(0,1.2fr)_auto] gap-5 items-center rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-5 transition-all duration-200 hover:border-slate-200 hover:bg-white even:bg-slate-50/40",
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{card.word}</h3>
          <button
             onClick={() => onPlayAudio(card.word)}
             className="text-muted-foreground hover:text-primary transition-colors p-1"
             aria-label="Lire la prononciation"
          >
             <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
	           {posTag && (
	             <Badge variant="secondary" className="h-5 border-transparent bg-muted/60 px-1.5 text-[10px] font-medium uppercase text-muted-foreground">
	               {posTag}
	             </Badge>
	           )}
	           {statusBadge}
	        </div>
	      </div>

      {/* 3. Meaning/Context Column (60%) */}
	      <div className="min-w-0 space-y-2 border-l border-slate-200/80 pl-5">
	         <div className="flex items-center gap-4">
	            <span className="text-base font-medium text-slate-700">{card.translation || "Aucune traduction"}</span>
	            {masteryProgress}
	         </div>
         {card.notes?.[0] && (
           <div className="max-w-2xl border-l-2 border-primary/25 pl-3">
             <p className="truncate pr-4 text-sm italic text-slate-500">
               {card.notes[0]}
             </p>
           </div>
         )}
      </div>

      {/* 4. Actions Column (15% visual weight, auto width) */}
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => onEdit(card)}
            title="Modifier la carte"
         >
            <Pencil className="h-4 w-4" />
         </Button>
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(card)}
            title="Supprimer la carte"
         >
            <Trash2 className="h-4 w-4" />
         </Button>
      </div>
    </div>
  )
}
