/**
 * FormPageTemplate - Centralized form page layout
 *
 * Provides consistent structure for all create/edit forms:
 * - Centered container with configurable max-width
 * - Back link navigation
 * - Card with icon header
 * - Form wrapper with submit handling
 * - Cancel/Submit button layout
 * - Optional permission/feature guards
 *
 * @example
 * <FormPageTemplate
 *   title="New Vendor"
 *   description="Add a new vendor/supplier"
 *   icon={Building2}
 *   iconColor="purple"
 *   backHref="/expenses/vendors"
 *   backLabel="Back to Vendors"
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.push("/expenses/vendors")}
 *   submitLabel="Create Vendor"
 *   loading={loading}
 *   permission="expenses.create"
 *   feature="expenses"
 * >
 *   {form fields}
 * </FormPageTemplate>
 */

"use client"

import Link from "next/link"
import { ArrowLeft, type LucideIcon } from "lucide-react"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import type { FeatureFlagKey } from "@/lib/features"

// Icon background color variants
const iconColorVariants = {
  teal: "bg-teal-100 text-teal-600",
  emerald: "bg-emerald-100 text-emerald-600",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-600",
  indigo: "bg-indigo-100 text-indigo-600",
  pink: "bg-pink-100 text-pink-600",
  gray: "bg-gray-100 text-gray-600",
} as const

export type IconColor = keyof typeof iconColorVariants

export interface FormPageTemplateProps {
  /** Form title displayed in card header */
  title: string
  /** Form description/subtitle */
  description?: string
  /** Lucide icon component for header */
  icon: LucideIcon
  /** Icon background color variant */
  iconColor?: IconColor

  /** Back link destination */
  backHref: string
  /** Back link label (defaults to "Back") */
  backLabel?: string

  /** Form submit handler */
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  /** Cancel button handler (if not provided, uses Link to backHref) */
  onCancel?: () => void
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Whether form is submitting */
  loading?: boolean
  /** Loading state label */
  loadingLabel?: string
  /** Whether submit is disabled (besides loading) */
  disabled?: boolean

  /** Maximum width class (default: "max-w-2xl") */
  maxWidth?: "max-w-xl" | "max-w-2xl" | "max-w-3xl" | "max-w-4xl"

  /** Permission required to view this form */
  permission?: string
  /** Feature flag required */
  feature?: FeatureFlagKey

  /** Form content */
  children: React.ReactNode

  /** Additional content after submit buttons (e.g., delete button) */
  actions?: React.ReactNode
}

export function FormPageTemplate({
  title,
  description,
  icon: Icon,
  iconColor = "teal",
  backHref,
  backLabel = "Back",
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  loadingLabel,
  disabled = false,
  maxWidth = "max-w-2xl",
  permission,
  feature,
  children,
  actions,
}: FormPageTemplateProps) {
  // Build the loading text
  const submitText = loading
    ? loadingLabel || `${submitLabel.replace(/^(Create|Save|Add|Update)/, "$1ing")}...`
    : submitLabel

  // Inner content without guards
  const content = (
    <div className={`${maxWidth} mx-auto py-6`}>
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Link>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconColorVariants[iconColor]}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                {description && (
                  <CardDescription>{description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">{children}</CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          {actions}
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href={backHref}>{cancelLabel}</Link>
            </Button>
          )}
          <Button type="submit" disabled={loading || disabled}>
            {submitText}
          </Button>
        </div>
      </form>
    </div>
  )

  // Wrap with guards if needed
  if (feature && permission) {
    return (
      <FeatureGuard feature={feature}>
        <PermissionGuard permission={permission}>{content}</PermissionGuard>
      </FeatureGuard>
    )
  }

  if (feature) {
    return <FeatureGuard feature={feature}>{content}</FeatureGuard>
  }

  if (permission) {
    return <PermissionGuard permission={permission}>{content}</PermissionGuard>
  }

  return content
}

// Note: FormSection is already exported from form-components.tsx
// Use: import { FormSection } from "@/components/ui"

/**
 * FormGrid - Grid layout for form fields
 *
 * @example
 * <FormGrid cols={2}>
 *   <FormField label="First Name">...</FormField>
 *   <FormField label="Last Name">...</FormField>
 * </FormGrid>
 */
export interface FormGridProps {
  /** Number of columns */
  cols?: 2 | 3 | 4
  /** Grid content */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }

  return (
    <div className={`grid ${gridCols[cols]} gap-4 ${className || ""}`}>
      {children}
    </div>
  )
}
