/**
 * Vendor Selector Component
 *
 * A reusable component for selecting an existing vendor or creating a new one inline.
 * Follows the same pattern as PersonSelector for consistent UX.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Plus,
  Phone,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Store,
  MapPin,
} from "lucide-react"
import { showSuccess, showError, showInfo } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"
import type { Vendor } from "@/types/expense-enhanced.types"

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

interface QuickCreateForm {
  name: string
  phone: string
  address: string
}

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
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateForm, setQuickCreateForm] = useState<QuickCreateForm>({
    name: "",
    phone: "",
    address: "",
  })
  const [creating, setCreating] = useState(false)

  // Fetch selected vendor details if ID provided
  useEffect(() => {
    if (selectedVendorId && !selectedVendor) {
      const fetchVendor = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", selectedVendorId)
          .single()

        if (data) {
          setSelectedVendor(data)
        }
      }
      fetchVendor()
    }
  }, [selectedVendorId, selectedVendor])

  // Search for vendors (or load all if no query)
  const searchVendors = useCallback(async (query: string) => {
    setLoading(true)
    const supabase = createClient()

    let queryBuilder = supabase
      .from("vendors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(20)

    // Apply search filter if query provided
    if (query && query.length > 0) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    }

    const { data, error: searchError } = await queryBuilder

    if (searchError) {
      console.error("Search error:", searchError)
      setResults([])
    } else {
      setResults(data || [])
    }

    setLoading(false)
  }, [workspaceId])

  // Debounced search - also load on open with empty search
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      searchVendors(search)
    }, search ? 300 : 0) // Immediate load if no search, debounce if typing

    return () => clearTimeout(timer)
  }, [search, isOpen, searchVendors])

  // Handle vendor selection
  const handleSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    onSelect(vendor)
    setIsOpen(false)
    setSearch("")
  }

  // Handle quick create
  const handleQuickCreate = async () => {
    if (!quickCreateForm.name.trim()) {
      showError("Vendor name is required")
      return
    }

    setCreating(true)
    const supabase = createClient()

    // Check for existing vendor with same name
    const { data: existing } = await supabase
      .from("vendors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .ilike("name", quickCreateForm.name.trim())
      .is("deleted_at", null)
      .maybeSingle()

    if (existing) {
      showInfo("Vendor already exists with this name")
      handleSelect(existing)
      setCreating(false)
      setShowQuickCreate(false)
      return
    }

    // Create new vendor
    const { data: newVendor, error: createError } = await supabase
      .from("vendors")
      .insert(
        withCreatedBy({
          workspace_id: workspaceId,
          name: quickCreateForm.name.trim(),
          phone: quickCreateForm.phone || null,
          address: quickCreateForm.address || null,
          is_active: true,
        }, userId)
      )
      .select("*")
      .single()

    if (createError) {
      console.error("Create error:", createError)
      showError("Failed to create vendor")
      setCreating(false)
      return
    }

    showSuccess("Vendor created successfully")
    handleSelect(newVendor)
    onCreate?.(newVendor)
    setCreating(false)
    setShowQuickCreate(false)
    setQuickCreateForm({ name: "", phone: "", address: "" })
  }

  // Clear selection
  const handleClear = () => {
    setSelectedVendor(null)
    setSearch("")
    onSelect(null)
  }

  // If vendor is selected, show selection card (or compact display)
  if (selectedVendor) {
    // Compact mode - simple inline display matching input height
    if (compact) {
      return (
        <div className="space-y-2">
          <div className={cn(
            "h-10 flex items-center justify-between gap-2 px-3 rounded-lg border",
            error ? "border-red-300" : "border-primary/30 bg-primary/5"
          )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Store className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <span className="font-medium truncate text-sm">{selectedVendor.name}</span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )
    }

    // Full card mode
    return (
      <div className="space-y-2">
        <Card className={cn(
          "border-2",
          error ? "border-red-300" : "border-primary/30 bg-primary/5"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Store className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <span className="font-medium truncate block">{selectedVendor.name}</span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedVendor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedVendor.phone}
                      </span>
                    )}
                    {selectedVendor.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {selectedVendor.address}
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
                  onClick={handleClear}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className={cn("pl-10 pr-10", error && "border-red-300")}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && isOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-64 overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-56 overflow-y-auto">
                  {results.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                      onClick={() => handleSelect(vendor)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Store className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{vendor.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {vendor.phone && <span>{vendor.phone}</span>}
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : search ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No vendors found matching "{search}"
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No vendors yet. Add one below.
                </div>
              )}

              {/* Quick Create Option */}
              {allowQuickCreate && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowQuickCreate(true)
                      setIsOpen(false)
                      // Pre-fill name from search
                      if (search && !/^\d+$/.test(search)) {
                        setQuickCreateForm((prev) => ({ ...prev, name: search }))
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Vendor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Create Form */}
      {showQuickCreate && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Vendor</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", phone: "", address: "" })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Vendor Name *"
                value={quickCreateForm.name}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Phone Number"
                value={quickCreateForm.phone}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <Input
                placeholder="Address"
                value={quickCreateForm.address}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", phone: "", address: "" })
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleQuickCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create & Select
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default VendorSelector
