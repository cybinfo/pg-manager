"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ChevronDown, LucideIcon, IndianRupee, Mail, Calendar, Search } from "lucide-react"

// ============================================
// Form Field Wrapper
// ============================================
interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className
}: FormFieldProps) {
  const generatedId = React.useId()
  const fieldId = htmlFor || generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined

  // Clone child element to add accessibility props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>, {
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": !!error,
      })
    }
    return child
  })

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
      </Label>
      {enhancedChildren}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-rose-500" role="alert">{error}</p>
      )}
    </div>
  )
}

// ============================================
// Styled Select Component
// ============================================
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  placeholder?: string
  icon?: LucideIcon
}

export function Select({
  options,
  placeholder,
  icon: Icon,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      )}
      <select
        className={cn(
          "w-full h-10 rounded-lg border border-input bg-white text-sm",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
          "hover:border-slate-400",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "appearance-none cursor-pointer",
          Icon ? "pl-10 pr-10" : "pl-3 pr-10",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

// ============================================
// Currency Input
// ============================================
interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  currency?: string
}

export function CurrencyInput({
  currency = "₹",
  className,
  ...props
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
        {currency}
      </span>
      <Input
        type="number"
        min="0"
        step="0.01"
        className={cn("pl-8 tabular-nums", className)}
        {...props}
      />
    </div>
  )
}

// ============================================
// Phone Input - UI-001: Consolidated in phone-input.tsx
// Import from "@/components/ui/phone-input" or "@/components/ui"
// ============================================

// ============================================
// Email Input
// ============================================
export function EmailInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="email"
        className={cn("pl-10", className)}
        placeholder="email@example.com"
        {...props}
      />
    </div>
  )
}

// ============================================
// Date Input
// ============================================
export function DateInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="date"
        className={cn("pl-10", className)}
        {...props}
      />
    </div>
  )
}

// ============================================
// Search Input
// ============================================
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
}

export function SearchInput({
  className,
  onSearch,
  ...props
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        className={cn("pl-10", className)}
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    </div>
  )
}

// ============================================
// Textarea with character count
// ============================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number
  showCount?: boolean
}

export function Textarea({
  className,
  maxLength,
  showCount = false,
  value,
  ...props
}: TextareaProps) {
  const charCount = typeof value === 'string' ? value.length : 0

  return (
    <div className="relative">
      <textarea
        className={cn(
          "w-full min-h-[100px] px-3 py-2 rounded-lg border border-input bg-white text-sm",
          "transition-all duration-200 resize-y",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      {showCount && maxLength && (
        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
          {charCount}/{maxLength}
        </span>
      )}
    </div>
  )
}

// ============================================
// Form Section Wrapper
// ============================================
interface FormSectionProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3 pb-2 border-b">
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// ============================================
// Toggle Switch
// ============================================
interface ToggleSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className
}: ToggleSwitchProps) {
  const switchId = React.useId()
  const labelId = label ? `${switchId}-label` : undefined
  const descriptionId = description ? `${switchId}-desc` : undefined
  const describedBy = [labelId, descriptionId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {(label || description) && (
        <div className="flex-1">
          {label && <p id={labelId} className="font-medium text-sm">{label}</p>}
          {description && <p id={descriptionId} className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-label={!label ? "Toggle switch" : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          // UI-005: Added focus styles for keyboard accessibility
          "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
          checked ? "bg-teal-500" : "bg-slate-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
