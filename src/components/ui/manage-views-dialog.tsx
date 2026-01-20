/**
 * ManageViewsDialog Component
 *
 * Dialog for managing saved views - rename, delete, set/clear default.
 */

"use client"

import { useState } from "react"
import {
  Star,
  Bookmark,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { TableView, TableViewConfig } from "@/lib/hooks/useTableViews"
import { formatDistanceToNow } from "date-fns"

// ============================================
// Types
// ============================================

export interface ManageViewsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  views: TableView[]
  activeViewId: string | null
  onUpdateView: (id: string, input: { name?: string; description?: string; config?: TableViewConfig }) => Promise<boolean>
  onDeleteView: (id: string) => Promise<boolean>
  onSetDefault: (id: string) => Promise<boolean>
  onClearDefault: () => Promise<boolean>
  onApplyView: (id: string) => void
}

// ============================================
// Component
// ============================================

export function ManageViewsDialog({
  open,
  onOpenChange,
  views,
  activeViewId,
  onUpdateView,
  onDeleteView,
  onSetDefault,
  onClearDefault,
  onApplyView,
}: ManageViewsDialogProps) {
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Handle edit start
  const handleEditStart = (view: TableView) => {
    setEditingId(view.id)
    setEditName(view.name)
  }

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingId(null)
    setEditName("")
  }

  // Handle edit save
  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return

    setSaving(true)
    try {
      const success = await onUpdateView(id, { name: editName.trim() })
      if (success) {
        setEditingId(null)
        setEditName("")
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return

    setDeleting(true)
    try {
      await onDeleteView(deleteConfirmId)
    } finally {
      setDeleting(false)
      setDeleteConfirmId(null)
    }
  }

  // Handle toggle default
  const handleToggleDefault = async (view: TableView) => {
    if (view.is_default) {
      await onClearDefault()
    } else {
      await onSetDefault(view.id)
    }
  }

  // Get view to delete name (for confirmation dialog)
  const viewToDelete = deleteConfirmId ? views.find((v) => v.id === deleteConfirmId) : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Views</DialogTitle>
            <DialogDescription>
              Rename, delete, or set a default view for this table.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
            {views.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No saved views yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {views.map((view) => (
                  <div
                    key={view.id}
                    className={`group relative rounded-lg border p-3 transition-colors ${
                      activeViewId === view.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {view.is_default ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {editingId === view.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleEditSave(view.id)
                                } else if (e.key === "Escape") {
                                  handleEditCancel()
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditSave(view.id)}
                              disabled={saving || !editName.trim()}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleEditCancel}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{view.name}</span>
                              {activeViewId === view.id && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                  Active
                                </span>
                              )}
                            </div>
                            {view.description && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {view.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Used {view.use_count} time{view.use_count !== 1 ? "s" : ""}
                              {view.last_used_at && (
                                <> · Last used {formatDistanceToNow(new Date(view.last_used_at), { addSuffix: true })}</>
                              )}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {editingId !== view.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onApplyView(view.id)}
                            title="Apply this view"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleToggleDefault(view)}
                            title={view.is_default ? "Remove as default" : "Set as default"}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                view.is_default ? "text-amber-500 fill-amber-500" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEditStart(view)}
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(view.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete View"
        description={`Are you sure you want to delete "${viewToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
