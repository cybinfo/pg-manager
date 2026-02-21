/**
 * EntitySelector - Unified base component for entity search, selection, and quick creation.
 *
 * Used by PersonSelector, ProductSelector, and VendorSelector as thin wrappers.
 * Handles: debounced search, dropdown results, selected display, quick-create form,
 * duplicate detection, click-outside-to-close, compact mode, loading/error states.
 */

"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Plus,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { showSuccess, showError, showInfo } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

/** Configuration for a quick-create form field */
export interface QuickCreateFieldConfig {
  /** Field key in the form data record */
  key: string
  /** Placeholder text */
  placeholder: string
  /** HTML input type (default: "text") */
  type?: string
  /** Whether this field is required */
  required?: boolean
  /** Grid column span class (e.g., "col-span-2") */
  className?: string
  /** Custom render function for non-input fields (e.g., Select) */
  render?: (
    value: string,
    onChange: (value: string) => void
  ) => ReactNode
}

/** Configuration that defines how an entity type works with EntitySelector */
export interface EntitySelectorConfig<T extends { id: string }> {
  /** Supabase table name */
  table: string
  /** Supabase select clause (can include joins) */
  select: string
  /** Columns to search with ilike (combined with OR) */
  searchColumns: string[]
  /** Column to order results by */
  orderBy?: string
  /** Max results to show */
  limit?: number
  /** Minimum search characters before querying (0 = load all on open) */
  minSearchLength?: number

  /** Filter key for workspace/owner scoping (e.g., "owner_id" or "workspace_id") */
  scopeColumn: string
  /** Additional static filters to apply (e.g., is_active, deleted_at) */
  staticFilters?: Array<{
    column: string
    op: "eq" | "is"
    value: unknown
  }>

  /** Render a single result item in the dropdown */
  renderItem: (item: T) => ReactNode
  /** Render the selected item (full card mode) */
  renderSelected: (item: T, options: { onClear: () => void; disabled: boolean; error?: string }) => ReactNode
  /** Render the selected item in compact mode (optional) */
  renderCompact?: (item: T, options: { onClear: () => void; disabled: boolean; error?: string }) => ReactNode
  /** Get display name for the entity (used in messages) */
  getDisplayName: (item: T) => string

  /** Entity label for UI text ("Person", "Product", "Vendor") */
  entityLabel: string
  /** Quick create button icon (default: Plus) */
  quickCreateIcon?: ReactNode

  /** Quick create form field definitions */
  quickCreateFields?: QuickCreateFieldConfig[]
  /** Whether to use grid layout for quick create form */
  quickCreateGrid?: boolean
  /** Default values for the quick create form */
  quickCreateDefaults?: Record<string, string>
  /**
   * Custom quick create handler. Receives form data, supabase client, userId, and scopeId.
   * Should return the created item, or null if duplicate was found (and handled internally).
   */
  onQuickCreate?: (
    formData: Record<string, string>,
    supabase: ReturnType<typeof createClient>,
    userId: string,
    scopeId: string
  ) => Promise<T | null>
  /** Whether to pre-fill the name field from search text */
  prefillNameFromSearch?: (search: string) => boolean

  /** Custom function to apply additional filters to the search query */
  applyExtraFilters?: (
    query: ReturnType<ReturnType<typeof createClient>["from"]>["select"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any
  /** Custom post-fetch filter applied client-side */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientFilter?: (items: T[], extra: Record<string, any>) => T[]

  /** Empty state message when no results and no search */
  emptyMessage?: string
  /** Empty state message when no results for a search */
  noResultsMessage?: (search: string) => string
  /** Hint message below search input */
  searchHint?: string
}

/** Props for the EntitySelector component */
export interface EntitySelectorProps<T extends { id: string }> {
  /** The config defining entity behavior */
  config: EntitySelectorConfig<T>
  /** The workspace/owner ID for scoping queries */
  scopeId: string
  /** The user ID for audit (created_by) */
  userId: string
  /** Currently selected entity ID */
  selectedId?: string | null
  /** Callback when an entity is selected (null = cleared) */
  onSelect: (item: T | null) => void
  /** Callback after quick-creating an entity */
  onCreate?: (item: T) => void
  /** Allow inline quick-create form */
  allowQuickCreate?: boolean
  /** Use compact mode for selected display */
  compact?: boolean
  /** Disable the selector */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Mark as required */
  required?: boolean
  /** Override the default placeholder */
  placeholder?: string
  /** Pre-fill search with this value */
  initialSearch?: string
  /** Extra data passed to applyExtraFilters and clientFilter */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraFilterData?: Record<string, any>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntitySelector<T extends { id: string }>({
  config,
  scopeId,
  userId,
  selectedId,
  onSelect,
  onCreate,
  allowQuickCreate = true,
  compact = false,
  disabled = false,
  error,
  required = false,
  placeholder,
  initialSearch = "",
  extraFilterData = {},
}: EntitySelectorProps<T>) {
  const [search, setSearch] = useState(initialSearch)
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateForm, setQuickCreateForm] = useState<Record<string, string>>(
    config.quickCreateDefaults ? { ...config.quickCreateDefaults } : {}
  )
  const [creating, setCreating] = useState(false)

  const minSearchLength = config.minSearchLength ?? 0
  const effectivePlaceholder = placeholder ?? `Search ${config.entityLabel.toLowerCase()}s...`

  // --------------------------------------------------
  // Fetch selected item by ID on mount
  // --------------------------------------------------
  useEffect(() => {
    if (selectedId && !selectedItem) {
      const fetchItem = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from(config.table)
          .select(config.select)
          .eq("id", selectedId)
          .single()

        if (data) {
          setSelectedItem(data as T)
        }
      }
      fetchItem()
    }
  }, [selectedId, selectedItem, config.table, config.select])

  // --------------------------------------------------
  // Search function
  // --------------------------------------------------
  const searchEntities = useCallback(async (query: string) => {
    if (minSearchLength > 0 && (!query || query.length < minSearchLength)) {
      setResults([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryBuilder: any = supabase
      .from(config.table)
      .select(config.select)
      .eq(config.scopeColumn, scopeId)

    // Apply static filters
    if (config.staticFilters) {
      for (const filter of config.staticFilters) {
        if (filter.op === "eq") {
          queryBuilder = queryBuilder.eq(filter.column, filter.value)
        } else if (filter.op === "is") {
          queryBuilder = queryBuilder.is(filter.column, filter.value)
        }
      }
    }

    // Apply search OR clause
    if (query && query.length > 0 && config.searchColumns.length > 0) {
      const orClause = config.searchColumns
        .map((col: string) => `${col}.ilike.%${query}%`)
        .join(",")
      queryBuilder = queryBuilder.or(orClause)
    }

    // Apply extra filters from wrapper
    if (config.applyExtraFilters) {
      queryBuilder = config.applyExtraFilters(queryBuilder, extraFilterData)
    }

    queryBuilder = queryBuilder
      .order(config.orderBy ?? "name")
      .limit(config.limit ?? 20)

    const { data, error: searchError } = await queryBuilder

    if (searchError) {
      console.error("Search error:", searchError)
      setResults([])
    } else {
      let items = (data || []) as T[]
      // Client-side filtering
      if (config.clientFilter) {
        items = config.clientFilter(items, extraFilterData)
      }
      setResults(items)
    }

    setLoading(false)
  }, [scopeId, config, extraFilterData])

  // --------------------------------------------------
  // Debounced search effect
  // --------------------------------------------------
  useEffect(() => {
    if (!isOpen) return

    const delay = search ? 300 : (minSearchLength === 0 ? 0 : 300)
    const timer = setTimeout(() => {
      searchEntities(search)
    }, delay)

    return () => clearTimeout(timer)
  }, [search, isOpen, searchEntities, minSearchLength])

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const handleSelect = (item: T) => {
    setSelectedItem(item)
    onSelect(item)
    setIsOpen(false)
    setSearch("")
  }

  const handleClear = () => {
    setSelectedItem(null)
    setSearch("")
    onSelect(null)
  }

  const handleQuickCreate = async () => {
    if (!config.onQuickCreate) return

    // Check required fields
    const requiredFields = config.quickCreateFields?.filter((f: QuickCreateFieldConfig) => f.required) || []
    for (const field of requiredFields) {
      if (!quickCreateForm[field.key]?.trim()) {
        showError(`${field.placeholder.replace(" *", "")} is required`)
        return
      }
    }

    setCreating(true)
    const supabase = createClient()

    const result = await config.onQuickCreate(quickCreateForm, supabase, userId, scopeId)

    if (result) {
      showSuccess(`${config.entityLabel} created successfully`)
      handleSelect(result)
      onCreate?.(result)
    }
    // If null, the onQuickCreate handler already dealt with it (e.g., duplicate found, toast shown, auto-selected)

    setCreating(false)
    setShowQuickCreate(false)
    setQuickCreateForm(config.quickCreateDefaults ? { ...config.quickCreateDefaults } : {})
  }

  const updateFormField = (key: string, value: string) => {
    setQuickCreateForm((prev) => ({ ...prev, [key]: value }))
  }

  // --------------------------------------------------
  // Render: selected item
  // --------------------------------------------------
  if (selectedItem) {
    if (compact && config.renderCompact) {
      return config.renderCompact(selectedItem, { onClear: handleClear, disabled, error })
    }
    return config.renderSelected(selectedItem, { onClear: handleClear, disabled, error })
  }

  // --------------------------------------------------
  // Render: search + dropdown + quick create
  // --------------------------------------------------
  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={effectivePlaceholder}
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
              {loading && minSearchLength === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-56 overflow-y-auto">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                      onClick={() => handleSelect(item)}
                    >
                      {config.renderItem(item)}
                      <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (minSearchLength > 0 && search.length < minSearchLength) ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {config.searchHint ?? `Type at least ${minSearchLength} characters to search`}
                </div>
              ) : search ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {config.noResultsMessage
                    ? config.noResultsMessage(search)
                    : `No ${config.entityLabel.toLowerCase()}s found matching "${search}"`}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {config.emptyMessage ?? `No ${config.entityLabel.toLowerCase()}s yet. Add one below.`}
                </div>
              )}

              {/* Quick Create Button */}
              {allowQuickCreate && config.quickCreateFields && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowQuickCreate(true)
                      setIsOpen(false)
                      // Pre-fill name from search if applicable
                      const shouldPrefill = config.prefillNameFromSearch
                        ? config.prefillNameFromSearch(search)
                        : !!search
                      if (shouldPrefill && search) {
                        setQuickCreateForm((prev) => ({ ...prev, name: search }))
                      }
                    }}
                  >
                    {config.quickCreateIcon ?? <Plus className="mr-2 h-4 w-4" />}
                    Add New {config.entityLabel}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Create Form */}
      {showQuickCreate && config.quickCreateFields && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New {config.entityLabel}</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm(config.quickCreateDefaults ? { ...config.quickCreateDefaults } : {})
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className={config.quickCreateGrid ? "grid grid-cols-2 gap-3" : "space-y-3"}>
              {config.quickCreateFields.map((field: QuickCreateFieldConfig) =>
                field.render ? (
                  <div key={field.key} className={field.className}>
                    {field.render(
                      quickCreateForm[field.key] ?? "",
                      (val: string) => updateFormField(field.key, val)
                    )}
                  </div>
                ) : (
                  <Input
                    key={field.key}
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={quickCreateForm[field.key] ?? ""}
                    onChange={(e) => updateFormField(field.key, e.target.value)}
                    className={field.className}
                  />
                )
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm(config.quickCreateDefaults ? { ...config.quickCreateDefaults } : {})
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
      {required && !selectedItem && config.searchHint && (
        <p className="text-xs text-muted-foreground">
          {config.searchHint}
        </p>
      )}

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

export default EntitySelector
