"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { ReactNode } from "react"

export interface PhoneData {
  number: string
  type: string
  is_primary: boolean
  is_whatsapp: boolean
}

export const DEFAULT_PHONE: PhoneData = {
  number: "",
  type: "primary",
  is_primary: true,
  is_whatsapp: true,
}

interface PhoneEntryProps {
  value: PhoneData
  onChange: (field: keyof PhoneData, value: string | boolean) => void
  onRemove?: () => void
  showRemove?: boolean
  disabled?: boolean
  /** Show loading spinner (e.g., when checking for returning tenant) */
  loading?: boolean
  /** Group name for primary radio buttons */
  groupName?: string
}

/**
 * Phone number entry row with WhatsApp toggle and primary selection.
 * Styled with p-3 border rounded-lg bg-muted/30.
 */
export function PhoneEntry({
  value,
  onChange,
  onRemove,
  showRemove = true,
  disabled = false,
  loading = false,
  groupName = "primaryPhone",
}: PhoneEntryProps) {
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1 relative">
        <Input
          type="tel"
          placeholder="e.g., 9876543210"
          value={value.number}
          onChange={(e) => onChange("number", e.target.value)}
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
        <input
          type="checkbox"
          checked={value.is_whatsapp}
          onChange={(e) => onChange("is_whatsapp", e.target.checked)}
          className="h-4 w-4"
          disabled={disabled}
        />
        WhatsApp
      </label>
      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
        <input
          type="radio"
          name={groupName}
          checked={value.is_primary}
          onChange={() => onChange("is_primary", true)}
          className="h-4 w-4"
          disabled={disabled}
        />
        Primary
      </label>
      {showRemove && onRemove && (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={disabled}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )
}
