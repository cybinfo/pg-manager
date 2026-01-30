/**
 * FormDialog Component
 *
 * Reusable dialog component for forms with consistent structure.
 * Eliminates duplicate dialog patterns across 4+ files.
 *
 * @example
 * <FormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Add New Item"
 *   description="Fill in the details below"
 *   icon={Plus}
 *   loading={isSubmitting}
 *   onSubmit={handleSubmit}
 *   submitText="Create"
 * >
 *   <Input name="name" value={formData.name} onChange={handleChange} />
 * </FormDialog>
 */

"use client"

import { ReactNode } from "react"
import { Loader2, LucideIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

interface FormDialogProps {
  /** Control dialog open state */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Optional description below title */
  description?: string
  /** Optional icon to show next to title */
  icon?: LucideIcon
  /** Icon color class (default: "text-primary") */
  iconColor?: string
  /** Loading state for submit button */
  loading?: boolean
  /** Submit handler (called on form submit) */
  onSubmit: () => Promise<void> | void
  /** Submit button text (default: "Submit") */
  submitText?: string
  /** Cancel button text (default: "Cancel") */
  cancelText?: string
  /** Whether to show cancel button (default: true) */
  showCancel?: boolean
  /** Submit button variant */
  submitVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /** Dialog content max width class */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
  /** Form content */
  children: ReactNode
  /** Additional class name for content */
  className?: string
  /** Disable submit button */
  submitDisabled?: boolean
  /** Footer content to render before buttons */
  footerPrefix?: ReactNode
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  loading = false,
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",
  showCancel = true,
  submitVariant = "default",
  maxWidth = "md",
  children,
  className,
  submitDisabled = false,
  footerPrefix,
}: FormDialogProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], className)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">{children}</div>

          <DialogFooter className="gap-2 sm:gap-0">
            {footerPrefix}
            {showCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="submit"
              variant={submitVariant}
              disabled={loading || submitDisabled}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Confirmation dialog variant
 * For simple yes/no confirmations
 */
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void> | void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  destructive?: boolean
  icon?: LucideIcon
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  destructive = false,
  icon: Icon,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && (
              <Icon className={cn("h-5 w-5", destructive ? "text-destructive" : "text-primary")} />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={async () => {
              await onConfirm()
              onOpenChange(false)
            }}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Delete confirmation dialog
 * Preset for destructive delete confirmations
 */
interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  onDelete: () => Promise<void> | void
  loading?: boolean
}

export function DeleteDialog({
  open,
  onOpenChange,
  entityName,
  onDelete,
  loading = false,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${entityName}?`}
      description={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
      confirmText="Delete"
      onConfirm={onDelete}
      loading={loading}
      destructive
    />
  )
}
