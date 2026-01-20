/**
 * SavedViewSelector Component
 *
 * Dropdown selector for saved table views. Shows current view name
 * and allows switching between saved views or system default.
 */

"use client"

import { useState } from "react"
import { ChevronDown, Star, Bookmark, Settings2, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableView, TableViewConfig } from "@/lib/hooks/useTableViews"
import { SaveViewDialog } from "./save-view-dialog"
import { ManageViewsDialog } from "./manage-views-dialog"

// ============================================
// Types
// ============================================

export interface SavedViewSelectorProps {
  views: TableView[]
  activeViewId: string | null
  loading?: boolean
  currentConfig: TableViewConfig
  onApplyView: (id: string) => void
  onResetToDefault: () => void
  onCreateView: (input: { name: string; description?: string; is_default?: boolean; config: TableViewConfig }) => Promise<TableView | null>
  onUpdateView: (id: string, input: { name?: string; description?: string; config?: TableViewConfig }) => Promise<boolean>
  onDeleteView: (id: string) => Promise<boolean>
  onSetDefault: (id: string) => Promise<boolean>
  onClearDefault: () => Promise<boolean>
}

// ============================================
// Component
// ============================================

export function SavedViewSelector({
  views,
  activeViewId,
  loading = false,
  currentConfig,
  onApplyView,
  onResetToDefault,
  onCreateView,
  onUpdateView,
  onDeleteView,
  onSetDefault,
  onClearDefault,
}: SavedViewSelectorProps) {
  // Dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Get active view
  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) : null

  // Check if there are any customizations in current config
  const hasCustomizations =
    currentConfig.sort ||
    (currentConfig.filters && Object.keys(currentConfig.filters).length > 0) ||
    (currentConfig.groupBy && currentConfig.groupBy.length > 0) ||
    currentConfig.pageSize ||
    (currentConfig.hiddenColumns && currentConfig.hiddenColumns.length > 0)

  // Get display label
  const displayLabel = activeView ? activeView.name : "System Default"

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-2"
            disabled={loading}
          >
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[150px] truncate">{displayLabel}</span>
            {activeView?.is_default && (
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Views
          </DropdownMenuLabel>

          {/* System Default */}
          <DropdownMenuItem
            onClick={() => {
              onResetToDefault()
              setDropdownOpen(false)
            }}
            className={!activeViewId ? "bg-accent" : ""}
          >
            <RotateCcw className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="flex-1">System Default</span>
            {!activeViewId && (
              <span className="text-xs text-primary font-medium">Active</span>
            )}
          </DropdownMenuItem>

          {/* Saved Views */}
          {views.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Saved Views
              </DropdownMenuLabel>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => {
                    onApplyView(view.id)
                    setDropdownOpen(false)
                  }}
                  className={activeViewId === view.id ? "bg-accent" : ""}
                >
                  {view.is_default ? (
                    <Star className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" />
                  ) : (
                    <Bookmark className="h-4 w-4 mr-2 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{view.name}</span>
                  {activeViewId === view.id && (
                    <span className="text-xs text-primary font-medium">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem
            onClick={() => {
              setSaveDialogOpen(true)
              setDropdownOpen(false)
            }}
            disabled={!hasCustomizations && !activeView}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Save Current View</span>
          </DropdownMenuItem>

          {views.length > 0 && (
            <DropdownMenuItem
              onClick={() => {
                setManageDialogOpen(true)
                setDropdownOpen(false)
              }}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              <span>Manage Views</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <SaveViewDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        currentConfig={currentConfig}
        existingViewNames={views.map((v) => v.name)}
        onSave={onCreateView}
      />

      {/* Manage Views Dialog */}
      <ManageViewsDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        views={views}
        activeViewId={activeViewId}
        onUpdateView={onUpdateView}
        onDeleteView={onDeleteView}
        onSetDefault={onSetDefault}
        onClearDefault={onClearDefault}
        onApplyView={(id) => {
          onApplyView(id)
          setManageDialogOpen(false)
        }}
      />
    </>
  )
}
