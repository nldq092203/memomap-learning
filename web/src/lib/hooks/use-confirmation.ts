"use client"

import React, { useState, useCallback } from "react"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { ConfirmationType } from "@/components/ui/confirmation-dialog"

export interface ConfirmationOptions {
  title: string
  description: string
  type?: ConfirmationType
  confirmText?: string
  cancelText?: string
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationOptions | null>(null)
  const [onConfirm, setOnConfirm] = useState<(() => void | Promise<void>) | null>(null)
  const [onCancel, setOnCancel] = useState<(() => void) | null>(null)
  const [loading, setLoading] = useState(false)

  const confirm = useCallback((
    confirmationOptions: ConfirmationOptions,
    confirmAction: () => void | Promise<void>,
    cancelAction?: () => void
  ) => {
    setOptions(confirmationOptions)
    setOnConfirm(() => confirmAction)
    setOnCancel(() => cancelAction || null)
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (onConfirm) {
      setLoading(true)
      try {
        await onConfirm()
      } finally {
        setLoading(false)
        setIsOpen(false)
      }
    }
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
    setIsOpen(false)
  }, [onCancel])

  const ConfirmationComponent = useCallback(() => {
    if (!options) return null

    return React.createElement(ConfirmationDialog, {
      open: isOpen,
      onOpenChange: setIsOpen,
      title: options.title,
      description: options.description,
      variant: options.type,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      isLoading: loading
    })
  }, [isOpen, options, handleConfirm, handleCancel, loading])

  return {
    confirm,
    ConfirmationComponent,
    isOpen,
    close: () => setIsOpen(false),
  }
}
