/**
 * InlineEditCell Component
 *
 * Wrapper component for inline cell editing. Handles edit state, keyboard
 * navigation, and rendering the appropriate input type.
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2, Check, X, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/form-components"
import { Checkbox } from "@/components/ui/checkbox"
import type {
  EditType,
  EditValidation,
  SelectOption,
} from "./types"
import { validateValue } from "./types"

export interface InlineEditCellProps {
  /** Current value */
  value: unknown
  /** Field name for updates */
  field: string
  /** Edit input type */
  editType?: EditType
  /** Options for select type */
  editOptions?: SelectOption[]
  /** Validation rules */
  validation?: EditValidation
  /** Callback when save is triggered - returns true if successful */
  onSave: (field: string, value: unknown) => Promise<boolean>
  /** Whether editing is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Custom render function for display mode */
  renderDisplay?: (value: unknown) => React.ReactNode
  /** Additional class name for the wrapper */
  className?: string
}

export function InlineEditCell({
  value,
  field,
  editType = "text",
  editOptions = [],
  validation,
  onSave,
  disabled = false,
  placeholder,
  renderDisplay,
  className,
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [tempValue, setTempValue] = React.useState(value)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const selectRef = React.useRef<HTMLSelectElement>(null)

  // Reset temp value when the actual value changes
  React.useEffect(() => {
    if (!isEditing) {
      setTempValue(value)
    }
  }, [value, isEditing])

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing) {
      if (editType === "select") {
        selectRef.current?.focus()
      } else if (editType !== "boolean") {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
  }, [isEditing, editType])

  const handleSave = async () => {
    // Validate
    const validationError = validateValue(tempValue, validation)
    if (validationError) {
      setError(validationError)
      return
    }

    // Don't save if value hasn't changed
    if (tempValue === value) {
      setIsEditing(false)
      setError(null)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const success = await onSave(field, tempValue)
      if (success) {
        setIsEditing(false)
      } else {
        setError("Failed to save")
      }
    } catch {
      setError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTempValue(value)
    setError(null)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    e.stopPropagation()
    setIsEditing(true)
  }

  // Boolean type toggles directly without edit mode
  if (editType === "boolean") {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={async (checked) => {
            if (disabled || saving) return
            setSaving(true)
            try {
              await onSave(field, checked)
            } finally {
              setSaving(false)
            }
          }}
          disabled={disabled || saving}
        />
        {saving && (
          <Loader2 className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  // Display mode
  if (!isEditing) {
    const displayValue = renderDisplay
      ? renderDisplay(value)
      : value != null && value !== ""
        ? String(value)
        : <span className="text-muted-foreground">{placeholder || "—"}</span>

    return (
      <div
        className={cn(
          "group relative inline-flex items-center gap-1 min-w-0",
          !disabled && "cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1",
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setIsEditing(true)
          }
        }}
      >
        <span className="truncate">{displayValue}</span>
        {!disabled && (
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    )
  }

  // Edit mode
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {editType === "select" ? (
        <select
          ref={selectRef}
          value={String(tempValue ?? "")}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Small delay to allow click on save/cancel buttons
            setTimeout(() => {
              if (document.activeElement !== selectRef.current) {
                handleSave()
              }
            }, 150)
          }}
          disabled={saving}
          className={cn(
            "h-8 text-sm rounded border border-input bg-white px-2 pr-6",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            error && "border-red-500"
          )}
        >
          <option value="">Select...</option>
          {editOptions.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : editType === "date" ? (
        <Input
          ref={inputRef}
          type="date"
          value={tempValue ? String(tempValue).split("T")[0] : ""}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleSave()
              }
            }, 150)
          }}
          disabled={saving}
          className={cn("h-8 text-sm w-36", error && "border-red-500")}
        />
      ) : editType === "number" ? (
        <Input
          ref={inputRef}
          type="number"
          value={tempValue != null ? String(tempValue) : ""}
          onChange={(e) => setTempValue(e.target.value === "" ? null : Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleSave()
              }
            }, 150)
          }}
          disabled={saving}
          placeholder={placeholder}
          min={validation?.min}
          max={validation?.max}
          className={cn("h-8 text-sm w-24", error && "border-red-500")}
        />
      ) : (
        <Input
          ref={inputRef}
          type="text"
          value={String(tempValue ?? "")}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleSave()
              }
            }, 150)
          }}
          disabled={saving}
          placeholder={placeholder}
          maxLength={validation?.maxLength}
          className={cn("h-8 text-sm", error && "border-red-500")}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="p-1 hover:bg-green-50 rounded text-green-600"
              title="Save (Enter)"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 hover:bg-red-50 rounded text-red-600"
              title="Cancel (Escape)"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  )
}
