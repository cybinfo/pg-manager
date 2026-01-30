"use client"

/**
 * SubmitButton Component
 *
 * Consistent loading button pattern for forms.
 * Eliminates 8+ duplicate loading button patterns.
 *
 * @example
 * <SubmitButton loading={loading}>
 *   Create Tenant
 * </SubmitButton>
 *
 * // With custom loading text
 * <SubmitButton loading={loading} loadingText="Saving...">
 *   Save Changes
 * </SubmitButton>
 */

import { Loader2 } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  /** Whether the form is submitting */
  loading?: boolean
  /** Text to show while loading (default: derived from children) */
  loadingText?: string
  /** Children (button text when not loading) */
  children: React.ReactNode
  /** Button type (default: "submit") */
  type?: "submit" | "button"
}

export function SubmitButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  // Derive loading text from children if not provided
  const derivedLoadingText = loadingText || deriveLoadingText(children)

  return (
    <Button
      type={type}
      disabled={loading || disabled}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {derivedLoadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/**
 * Derive loading text from button text
 * "Create" -> "Creating..."
 * "Save" -> "Saving..."
 * "Submit" -> "Submitting..."
 */
function deriveLoadingText(children: React.ReactNode): string {
  if (typeof children !== "string") {
    return "Loading..."
  }

  const text = children.trim()

  // Common action word mappings
  const mappings: Record<string, string> = {
    Create: "Creating...",
    Save: "Saving...",
    Submit: "Submitting...",
    Update: "Updating...",
    Delete: "Deleting...",
    Add: "Adding...",
    Send: "Sending...",
    Upload: "Uploading...",
    Download: "Downloading...",
    Generate: "Generating...",
    Process: "Processing...",
    Confirm: "Confirming...",
    Apply: "Applying...",
    Remove: "Removing...",
  }

  // Check if text starts with a known action word
  for (const [action, loadingText] of Object.entries(mappings)) {
    if (text.startsWith(action)) {
      return loadingText
    }
  }

  // Default: append "ing..."
  if (text.endsWith("e")) {
    return `${text.slice(0, -1)}ing...`
  }

  return `${text}ing...`
}

/**
 * FormActions Component
 *
 * Standard form action button row with cancel and submit.
 *
 * @example
 * <FormActions
 *   loading={loading}
 *   onCancel={() => router.back()}
 *   submitText="Create Tenant"
 * />
 */
interface FormActionsProps {
  /** Whether form is submitting */
  loading?: boolean
  /** Cancel button handler */
  onCancel?: () => void
  /** Submit button text */
  submitText?: string
  /** Loading text */
  loadingText?: string
  /** Cancel button text */
  cancelText?: string
  /** Additional CSS classes */
  className?: string
  /** Show cancel button (default: true) */
  showCancel?: boolean
  /** Disabled state */
  disabled?: boolean
}

export function FormActions({
  loading = false,
  onCancel,
  submitText = "Submit",
  loadingText,
  cancelText = "Cancel",
  className,
  showCancel = true,
  disabled,
}: FormActionsProps) {
  return (
    <div className={cn("flex justify-end gap-4", className)}>
      {showCancel && onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
      )}
      <SubmitButton loading={loading} loadingText={loadingText} disabled={disabled}>
        {submitText}
      </SubmitButton>
    </div>
  )
}
