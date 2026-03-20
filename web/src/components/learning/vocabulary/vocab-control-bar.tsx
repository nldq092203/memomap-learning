"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  SlidersHorizontal,
  X 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VocabControlBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  viewMode: "list" | "grid"
  onViewModeChange: (mode: "list" | "grid") => void
  totalCount: number
  selectedCount: number
  onClearSelection: () => void
  onBulkAction: (action: string) => void
  onAddWord: () => void
}

export function VocabControlBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  totalCount,
  selectedCount,
  onClearSelection,
  onBulkAction,
  onAddWord,
}: VocabControlBarProps) {
  
  if (selectedCount > 0) {
    return (
      <div className="animate-in slide-in-from-top-2 duration-200 rounded-[20px] border border-primary/20 bg-primary/5 p-2">
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8">
             <X className="h-4 w-4" />
           </Button>
           <span className="text-sm font-medium text-primary">
             {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
           </span>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onBulkAction("review")} className="h-8 text-xs">
               Ajouter à la révision
            </Button>
            <Button size="sm" variant="outline" onClick={() => onBulkAction("suspend")} className="h-8 text-xs">
               Suspendre
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onBulkAction("delete")} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
               Supprimer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-1 md:flex-row md:items-center">
      {/* Search - Wide on left */}
      <div className="relative min-w-0 flex-1 md:min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={`Rechercher parmi ${totalCount} mots...`} 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 rounded-2xl border border-white/60 bg-white/70 pl-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm focus-visible:ring-primary/15"
        />
      </div>

      {/* Actions Group - Desktop */}
      <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
        {/* Filters */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-11 w-[150px] shrink-0 rounded-2xl border border-white/60 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:w-[170px]">
             <div className="flex items-center gap-2 text-muted-foreground">
               <SlidersHorizontal className="h-3.5 w-3.5" />
               <span className="text-sm truncate">
                 {statusFilter === "all" ? "Tous les statuts" : 
                  statusFilter === "review" ? "Maîtrisé" : 
                  statusFilter === "learning" ? "En apprentissage" :
                  "Nouveau"}
               </span>
             </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="new">Nouveau</SelectItem>
            <SelectItem value="learning">En apprentissage</SelectItem>
            <SelectItem value="review">Maîtrisé</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 hidden md:block" />

        {/* View Toggle */}
        <div className="flex items-center rounded-2xl border border-white/60 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
           <Button
             variant="ghost"
             size="sm"
             onClick={() => onViewModeChange("list")}
             className={cn(
               "h-7 w-7 p-0 rounded-md transition-all",
               viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
             )}
             title="Vue liste"
           >
             <ListIcon className="h-4 w-4" />
           </Button>
           <Button
             variant="ghost"
             size="sm"
             onClick={() => onViewModeChange("grid")}
             className={cn(
               "h-7 w-7 p-0 rounded-md transition-all",
               viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
             )}
             title="Vue grille"
           >
             <LayoutGrid className="h-4 w-4" />
           </Button>
        </div>

        {/* Add Button */}
        <Button onClick={onAddWord} className="ml-2 h-11 shrink-0 gap-2 rounded-2xl px-5 font-medium shadow-sm">
          <Plus className="h-4 w-4" />
          Ajouter un mot
        </Button>
      </div>
    </div>
  )
}
