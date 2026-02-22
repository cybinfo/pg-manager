/**
 * Vendor Selector Component
 *
 * A reusable component for selecting an existing vendor or creating a new one inline.
 * Thin wrapper around EntitySelector with vendor-specific rendering.
 */

"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Phone,
  X,
  Store,
  MapPin,
} from "lucide-react"
import { showInfo, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"
import type { Vendor } from "@/types/expense-enhanced.types"
import {
  EntitySelector,
  type EntitySelectorConfig,
} from "@/components/ui/entity-selector"

// ============================================================================
// PROPS (preserved exactly as before)
// ============================================================================

interface VendorSelectorProps {
  workspaceId: string
  userId: string
  selectedVendorId?: string | null
  onSelect: (vendor: Vendor | null) => void
  onCreate?: (vendor: Vendor) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  allowQuickCreate?: boolean
  /** Compact mode for inline/table use - shows simpler selected state */
  compact?: boolean
}

// ============================================================================
// HELPER RENDERERS
// ============================================================================

/** Render a vendor in the dropdown list */
function VendorDropdownItem({ vendor }: { vendor: Vendor }) {
  return (
    <>
      <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
        <Store className="h-4 w-4 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-medium truncate block">{vendor.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {vendor.phone && <span>{vendor.phone}</span>}
        </div>
      </div>
    </>
  )
}

/** Render selected vendor - full card mode */
function VendorSelectedCard({
  vendor,
  onClear,
  disabled,
  error,
}: {
  vendor: Vendor
  onClear: () => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Card className={cn(
        "border-2",
        error ? "border-destructive/30" : "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <span className="font-medium truncate block">{vendor.name}</span>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {vendor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {vendor.phone}
                    </span>
                  )}
                  {vendor.address && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {vendor.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** Render selected vendor - compact mode */
function VendorSelectedCompact({
  vendor,
  onClear,
  disabled,
  error,
}: {
  vendor: Vendor
  onClear: () => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <div className={cn(
        "h-10 flex items-center justify-between gap-2 px-3 rounded-lg border",
        error ? "border-destructive/30" : "border-primary/30 bg-primary/5"
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Store className="h-4 w-4 text-warning flex-shrink-0" />
          <span className="font-medium truncate text-sm">{vendor.name}</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VendorSelector({
  workspaceId,
  userId,
  selectedVendorId,
  onSelect,
  onCreate,
  placeholder = "Search vendors/shops...",
  disabled = false,
  required = false,
  error,
  allowQuickCreate = true,
  compact = false,
}: VendorSelectorProps) {
  const config: EntitySelectorConfig<Vendor> = useMemo(() => ({
    table: "vendors",
    select: "*",
    searchColumns: ["name", "phone"],
    orderBy: "name",
    limit: 20,
    minSearchLength: 0,
    scopeColumn: "workspace_id",
    staticFilters: [
      { column: "is_active", op: "eq" as const, value: true },
      { column: "deleted_at", op: "is" as const, value: null },
    ],
    entityLabel: "Vendor",

    renderItem: (vendor: Vendor) => <VendorDropdownItem vendor={vendor} />,

    renderSelected: (
      vendor: Vendor,
      opts: { onClear: () => void; disabled: boolean; error?: string }
    ) => (
      <VendorSelectedCard
        vendor={vendor}
        onClear={opts.onClear}
        disabled={opts.disabled}
        error={opts.error}
      />
    ),

    renderCompact: (
      vendor: Vendor,
      opts: { onClear: () => void; disabled: boolean; error?: string }
    ) => (
      <VendorSelectedCompact
        vendor={vendor}
        onClear={opts.onClear}
        disabled={opts.disabled}
        error={opts.error}
      />
    ),

    getDisplayName: (vendor: Vendor) => vendor.name,

    // Quick create fields
    quickCreateFields: [
      { key: "name", placeholder: "Vendor Name *", required: true },
      { key: "phone", placeholder: "Phone Number" },
      { key: "address", placeholder: "Address" },
    ],
    quickCreateDefaults: { name: "", phone: "", address: "" },

    // Pre-fill name from search unless it's all digits
    prefillNameFromSearch: (search: string) => !!search && !/^\d+$/.test(search),

    // Quick create handler
    onQuickCreate: async (formData, supabase, uid, scopeId) => {
      // Check for existing vendor with same name
      const { data: existing } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", scopeId)
        .ilike("name", formData.name.trim())
        .is("deleted_at", null)
        .maybeSingle()

      if (existing) {
        showInfo("Vendor already exists with this name")
        return existing as Vendor
      }

      // Create new vendor
      const { data: newVendor, error: createError } = await supabase
        .from("vendors")
        .insert(
          withCreatedBy({
            workspace_id: scopeId,
            name: formData.name.trim(),
            phone: formData.phone || null,
            address: formData.address || null,
            is_active: true,
          }, uid)
        )
        .select("*")
        .single()

      if (createError) {
        console.error("Create error:", createError)
        showError("Failed to create vendor")
        return null
      }

      onCreate?.(newVendor as Vendor)
      return newVendor as Vendor
    },

    noResultsMessage: (search: string) => `No vendors found matching "${search}"`,
    emptyMessage: "No vendors yet. Add one below.",
  }), [onCreate])

  return (
    <EntitySelector<Vendor>
      config={config}
      scopeId={workspaceId}
      userId={userId}
      selectedId={selectedVendorId}
      onSelect={onSelect}
      onCreate={onCreate}
      allowQuickCreate={allowQuickCreate}
      compact={compact}
      disabled={disabled}
      error={error}
      required={required}
      placeholder={placeholder}
    />
  )
}

export default VendorSelector
