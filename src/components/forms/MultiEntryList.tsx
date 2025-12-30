"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { ReactNode } from "react"

interface MultiEntryListProps<T> {
  label: string
  labelIcon?: ReactNode
  entries: T[]
  onAdd: () => void
  addLabel?: string
  renderEntry: (entry: T, index: number) => ReactNode
  minEntries?: number
  maxEntries?: number
  disabled?: boolean
}

/**
 * Generic component for managing a list of entries with add/remove functionality.
 * Used for phones, emails, addresses, guardians, and ID documents.
 */
export function MultiEntryList<T>({
  label,
  labelIcon,
  entries,
  onAdd,
  addLabel = "Add",
  renderEntry,
  minEntries = 1,
  maxEntries = 10,
  disabled = false,
}: MultiEntryListProps<T>) {
  const canAdd = entries.length < maxEntries

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {labelIcon}
          {label}
        </Label>
        {canAdd && (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {entries.map((entry, index) => renderEntry(entry, index))}
      </div>
    </div>
  )
}
