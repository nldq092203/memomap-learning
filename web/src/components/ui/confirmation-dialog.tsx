"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

export type ConfirmationType = "default" | "destructive"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmationType
  onConfirm: () => void
  onCancel?: () => void
  isLoading?: boolean
  // Third action button (optional)
  thirdAction?: {
    text: string
    variant?: "default" | "destructive" | "outline"
    onAction: () => void
  }
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
  thirdAction,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm()
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onCancel?.()
      onOpenChange(false)
    }
  }

  const handleThirdAction = () => {
    if (!isLoading && thirdAction) {
      thirdAction.onAction()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>
              {description
                .split("\n")
                .map((line, index) =>
                  line.trim().length === 0 ? null : (
                    <p
                      key={index}
                      className={index > 0 ? "mt-1" : undefined}
                    >
                      {line}
                    </p>
                  )
                )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={thirdAction ? "sm:justify-between" : ""}>
          <div className="flex gap-2 flex-1">
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              {cancelText}
            </Button>
            {thirdAction && (
              <Button
                variant={thirdAction.variant || "outline"}
                onClick={handleThirdAction}
                disabled={isLoading}
              >
                {thirdAction.text}
              </Button>
            )}
          </div>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy usage
export function useConfirmationDialog() {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmationType
    onConfirm: () => void
    onCancel?: () => void
    thirdAction?: {
      text: string
      variant?: "default" | "destructive" | "outline"
      onAction: () => void
    }
  } | null>(null)

  const confirm = React.useCallback((config: {
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmationType
    onConfirm: () => void
    onCancel?: () => void
    thirdAction?: {
      text: string
      variant?: "default" | "destructive" | "outline"
      onAction: () => void
    }
  }) => {
    setConfig(config)
    setOpen(true)
    setIsLoading(false)
  }, [])

  const setLoading = React.useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const dialog = config ? (
    <ConfirmationDialog
      open={open}
      onOpenChange={setOpen}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      onConfirm={config.onConfirm}
      onCancel={config.onCancel}
      isLoading={isLoading}
      thirdAction={config.thirdAction}
    />
  ) : null

  return { confirm, dialog, setLoading }
}
