"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit3, Trash2 } from "lucide-react"
import { LearningVocabCard } from "@/lib/types/learning-vocab"

interface SessionVocabularyListProps {
  vocabCards: LearningVocabCard[]
  editMode: boolean
}

export function SessionVocabularyList({ vocabCards, editMode }: SessionVocabularyListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vocabulary Cards</h2>
        {editMode && (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vocabCards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{card.word}</CardTitle>
                {editMode && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline">
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {card.translation && (
                  <p className="text-sm text-muted-foreground">
                    {card.translation}
                  </p>
                )}
                {card.notes && card.notes.length > 0 && (
                  <div className="space-y-1">
                    {card.notes.map((note, index) => (
                      <p key={index} className="text-xs italic text-muted-foreground">
                        • {note}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {card.language}
                  </Badge>
                  {card.review_stats?.due_at && new Date(card.review_stats.due_at) <= new Date() && (
                    <Badge variant="destructive" className="text-xs">
                      Due
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
