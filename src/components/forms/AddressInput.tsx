"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export interface AddressData {
  type?: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  is_primary?: boolean
}

export const ADDRESS_TYPES = ["Permanent", "Current", "Office", "Native", "Other"]

interface AddressInputProps {
  value: AddressData
  onChange: (value: AddressData) => void
  onRemove?: () => void
  showType?: boolean
  showPrimary?: boolean
  isPrimary?: boolean
  onPrimaryChange?: (isPrimary: boolean) => void
  disabled?: boolean
  label?: string
  required?: boolean
  /** Index for radio button group name uniqueness */
  index?: number
}

/**
 * Unified address input component used across property and tenant forms.
 * Provides consistent styling with p-3 border rounded-lg bg-muted/30.
 */
export function AddressInput({
  value,
  onChange,
  onRemove,
  showType = false,
  showPrimary = false,
  isPrimary = false,
  onPrimaryChange,
  disabled = false,
  label,
  required = false,
  index = 0,
}: AddressInputProps) {
  const updateField = (field: keyof AddressData, newValue: string) => {
    onChange({ ...value, [field]: newValue })
  }

  return (
    <div className="space-y-3">
      {label && <Label>{label}{required && " *"}</Label>}
      <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
        {/* Type and Primary row */}
        {(showType || showPrimary || onRemove) && (
          <div className="flex items-center gap-2">
            {showType && (
              <select
                value={value.type || "Permanent"}
                onChange={(e) => updateField("type", e.target.value)}
                className="h-10 px-3 rounded-md border bg-background text-sm"
                disabled={disabled}
              >
                {ADDRESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            {showPrimary && onPrimaryChange && (
              <label className="flex items-center gap-1 text-sm whitespace-nowrap ml-auto">
                <input
                  type="radio"
                  name={`primaryAddress-${index}`}
                  checked={isPrimary}
                  onChange={() => onPrimaryChange(true)}
                  className="h-4 w-4"
                  disabled={disabled}
                />
                Primary
              </label>
            )}
            {onRemove && (
              <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={disabled}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}

        <Input
          placeholder="Address Line 1"
          value={value.line1}
          onChange={(e) => updateField("line1", e.target.value)}
          disabled={disabled}
        />
        <Input
          placeholder="Address Line 2 (optional)"
          value={value.line2}
          onChange={(e) => updateField("line2", e.target.value)}
          disabled={disabled}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder={required ? "City *" : "City"}
            value={value.city}
            onChange={(e) => updateField("city", e.target.value)}
            required={required}
            disabled={disabled}
          />
          <Input
            placeholder="State"
            value={value.state}
            onChange={(e) => updateField("state", e.target.value)}
            disabled={disabled}
          />
          <Input
            placeholder="PIN Code"
            value={value.pincode}
            onChange={(e) => updateField("pincode", e.target.value)}
            disabled={disabled}
            maxLength={6}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Simple address input for property forms (single address, no type/primary).
 */
export function PropertyAddressInput({
  line1,
  line2,
  city,
  state,
  pincode,
  onChange,
  disabled = false,
}: {
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  onChange: (field: string, value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-3">
      <Label>Property Address</Label>
      <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
        <Input
          name="address_line1"
          placeholder="Address Line 1"
          value={line1}
          onChange={(e) => onChange("address_line1", e.target.value)}
          disabled={disabled}
        />
        <Input
          name="address_line2"
          placeholder="Address Line 2 (optional)"
          value={line2}
          onChange={(e) => onChange("address_line2", e.target.value)}
          disabled={disabled}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            name="city"
            placeholder="City *"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            required
            disabled={disabled}
          />
          <Input
            name="state"
            placeholder="State"
            value={state}
            onChange={(e) => onChange("state", e.target.value)}
            disabled={disabled}
          />
          <Input
            name="pincode"
            placeholder="PIN Code"
            value={pincode}
            onChange={(e) => onChange("pincode", e.target.value)}
            disabled={disabled}
            maxLength={6}
          />
        </div>
      </div>
    </div>
  )
}
