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
      <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-4 px-2">
           <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8">
             <X className="h-4 w-4" />
           </Button>
           <span className="text-sm font-medium text-primary">
             {selectedCount} selected
           </span>
           <Separator orientation="vertical" className="h-4" />
           <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => onBulkAction("review")} className="h-8 text-xs">
                 Add to Review
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkAction("suspend")} className="h-8 text-xs">
                 Suspend
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onBulkAction("delete")} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                 Delete
              </Button>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-1">
      {/* Search - Wide on left */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={`Search ${totalCount} words...`} 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background border-border/60 focus-visible:ring-primary/20 transition-shadow"
        />
      </div>

      {/* Actions Group - Desktop */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
        {/* Filters */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[130px] h-10 border-dashed bg-transparent">
             <div className="flex items-center gap-2 text-muted-foreground">
               <SlidersHorizontal className="h-3.5 w-3.5" />
               <span className="text-sm truncate">
                 {statusFilter === "all" ? "All Status" : 
                  statusFilter === "review" ? "Mastered" : 
                  statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
               </span>
             </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="review">Mastered</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 hidden md:block" />

        {/* View Toggle */}
        <div className="flex items-center bg-muted/40 rounded-lg p-1 border border-border/40">
           <Button
             variant="ghost"
             size="sm"
             onClick={() => onViewModeChange("list")}
             className={cn(
               "h-7 w-7 p-0 rounded-md transition-all",
               viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
             )}
             title="List View"
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
             title="Grid View"
           >
             <LayoutGrid className="h-4 w-4" />
           </Button>
        </div>

        {/* Add Button */}
        <Button onClick={onAddWord} className="h-10 px-5 gap-2 shadow-sm font-medium ml-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Word
        </Button>
      </div>
    </div>
  )
}
