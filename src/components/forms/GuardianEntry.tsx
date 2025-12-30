"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export interface GuardianData {
  name: string
  relation: string
  phone: string
  email: string
  is_primary: boolean
}

export const RELATION_TYPES = ["Parent", "Guardian", "Spouse", "Sibling", "Relative", "Friend", "Other"]

export const DEFAULT_GUARDIAN: GuardianData = {
  name: "",
  relation: "Parent",
  phone: "",
  email: "",
  is_primary: true,
}

interface GuardianEntryProps {
  value: GuardianData
  onChange: (field: keyof GuardianData, value: string | boolean) => void
  onRemove?: () => void
  showRemove?: boolean
  disabled?: boolean
  /** Group name for primary radio buttons */
  groupName?: string
}

/**
 * Guardian/emergency contact entry with relation type, name, phone, and email.
 * Styled with p-3 border rounded-lg bg-muted/30.
 */
export function GuardianEntry({
  value,
  onChange,
  onRemove,
  showRemove = true,
  disabled = false,
  groupName = "primaryGuardian",
}: GuardianEntryProps) {
  return (
    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={value.relation}
          onChange={(e) => onChange("relation", e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
          disabled={disabled}
        >
          {RELATION_TYPES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <Input
          placeholder="Name"
          value={value.name}
          onChange={(e) => onChange("name", e.target.value)}
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
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="tel"
          placeholder="Phone"
          value={value.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          disabled={disabled}
        />
        <Input
          type="email"
          placeholder="Email (optional)"
          value={value.email}
          onChange={(e) => onChange("email", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
