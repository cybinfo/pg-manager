"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export interface EmailData {
  email: string
  type: string
  is_primary: boolean
}

export const DEFAULT_EMAIL: EmailData = {
  email: "",
  type: "primary",
  is_primary: true,
}

interface EmailEntryProps {
  value: EmailData
  onChange: (field: keyof EmailData, value: string | boolean) => void
  onRemove?: () => void
  showRemove?: boolean
  disabled?: boolean
  /** Group name for primary radio buttons */
  groupName?: string
}

/**
 * Email entry row with primary selection.
 * Styled with p-3 border rounded-lg bg-muted/30.
 */
export function EmailEntry({
  value,
  onChange,
  onRemove,
  showRemove = true,
  disabled = false,
  groupName = "primaryEmail",
}: EmailEntryProps) {
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
      <Input
        type="email"
        placeholder="e.g., tenant@example.com"
        value={value.email}
        onChange={(e) => onChange("email", e.target.value)}
        className="flex-1"
        disabled={disabled}
      />
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
