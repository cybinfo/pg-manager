/**
 * SaveViewDialog Component
 *
 * Dialog for saving the current table configuration as a named view.
 * Shows a summary of what settings will be saved.
 */

"use client"

import { useState } from "react"
import { Loader2, Filter, ArrowUpDown, Layers, Columns3, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableView, TableViewConfig } from "@/lib/hooks/useTableViews"

// ============================================
// Types
// ============================================

export interface SaveViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConfig: TableViewConfig
  existingViewNames: string[]
  onSave: (input: {
    name: string
    description?: string
    is_default?: boolean
    config: TableViewConfig
  }) => Promise<TableView | null>
}

// ============================================
// Component
// ============================================

export function SaveViewDialog({
  open,
  onOpenChange,
  currentConfig,
  existingViewNames,
  onSave,
}: SaveViewDialogProps) {
  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate name
  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return "Name is required"
    }
    if (value.length > 50) {
      return "Name must be 50 characters or less"
    }
    if (existingViewNames.some((n) => n.toLowerCase() === value.trim().toLowerCase())) {
      return "A view with this name already exists"
    }
    return null
  }

  // Get config summary for display
  const getConfigSummary = () => {
    const items: { icon: typeof Filter; label: string; value: string }[] = []

    if (currentConfig.sort && currentConfig.sort.length > 0) {
      const sortDesc = currentConfig.sort
        .map((s) => `${s.key} (${s.direction})`)
        .join(", ")
      items.push({
        icon: ArrowUpDown,
        label: "Sort",
        value: currentConfig.sort.length === 1 ? sortDesc : `${currentConfig.sort.length} columns`,
      })
    }

    if (currentConfig.filters && Object.keys(currentConfig.filters).length > 0) {
      const filterCount = Object.keys(currentConfig.filters).filter(
        (k) => currentConfig.filters![k] && currentConfig.filters![k] !== "all"
      ).length
      if (filterCount > 0) {
        items.push({
          icon: Filter,
          label: "Filters",
          value: `${filterCount} active`,
        })
      }
    }

    if (currentConfig.groupBy && currentConfig.groupBy.length > 0) {
      items.push({
        icon: Layers,
        label: "Grouping",
        value: `${currentConfig.groupBy.length} level${currentConfig.groupBy.length > 1 ? "s" : ""}`,
      })
    }

    if (currentConfig.pageSize) {
      items.push({
        icon: Hash,
        label: "Page Size",
        value: `${currentConfig.pageSize} per page`,
      })
    }

    if (currentConfig.hiddenColumns && currentConfig.hiddenColumns.length > 0) {
      items.push({
        icon: Columns3,
        label: "Hidden Columns",
        value: `${currentConfig.hiddenColumns.length} hidden`,
      })
    }

    return items
  }

  const configSummary = getConfigSummary()

  // Handle save
  const handleSave = async () => {
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        is_default: isDefault,
        config: currentConfig,
      })

      if (result) {
        // Reset form and close
        setName("")
        setDescription("")
        setIsDefault(false)
        onOpenChange(false)
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle close
  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset form state
      setName("")
      setDescription("")
      setIsDefault(false)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save your current table configuration as a named view for quick access later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="view-name">Name *</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g., Active Tenants by Property"
              maxLength={50}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="view-description">Description (optional)</Label>
            <Textarea
              id="view-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this view..."
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Default Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="view-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="view-default" className="cursor-pointer text-sm font-normal">
              Set as my default view for this table
            </Label>
          </div>

          {/* Config Summary */}
          {configSummary.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Settings to save
              </p>
              <div className="space-y-1">
                {configSummary.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {configSummary.length === 0 && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                No custom settings to save. Modify the table view first (sort, filter, or group data).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save View"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
