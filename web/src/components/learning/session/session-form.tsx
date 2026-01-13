"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LEARNING_LANGS, type LearningLanguage } from "@/lib/services/learning-api"

interface SessionFormData {
  title: string
  language: LearningLanguage
  notes: string
}

interface SessionFormProps {
  initialData?: Partial<SessionFormData>
  onSubmit: (data: SessionFormData) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  title?: string
  showNotes?: boolean
  disabled?: boolean
}

export function SessionForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  title = "Session Details",
  showNotes = true,
  disabled = false
}: SessionFormProps) {
  const [formData, setFormData] = useState<SessionFormData>({
    title: initialData.title || "",
    language: initialData.language || LEARNING_LANGS[0],
    notes: initialData.notes || ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when initialData changes
  useEffect(() => {
    setFormData({
      title: initialData.title || "",
      language: initialData.language || LEARNING_LANGS[0],
      notes: initialData.notes || ""
    })
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }

    if (!formData.language) {
      newErrors.language = "Language is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1"
              placeholder="Enter session title"
              disabled={disabled}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Language</label>
            <Select
              value={formData.language}
              onValueChange={(value: LearningLanguage) => 
                setFormData(prev => ({ ...prev, language: value }))
              }
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LEARNING_LANGS.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.language && (
              <p className="text-sm text-red-600 mt-1">{errors.language}</p>
            )}
          </div>

          {showNotes && (
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
                placeholder="Optional notes about this session"
                rows={3}
                disabled={disabled}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={disabled}>
              {submitLabel}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={handleCancel} disabled={disabled}>
                {cancelLabel}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
