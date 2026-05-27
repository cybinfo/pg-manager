/**
 * TableRowActions Component
 *
 * Provides edit and delete action buttons for table rows.
 * Respects permissions and handles confirmations.
 *
 * @example
 * <TableRowActions
 *   row={row}
 *   onEdit={(row) => router.push(`/tenants/${row.id}/edit`)}
 *   onDelete={(row) => handleDelete(row.id)}
 *   editPermission="tenants.update"
 *   deletePermission="tenants.delete"
 * />
 */

"use client"

import * as React from "react"
import { Pencil, Trash2, MoreHorizontal, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/hooks"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// ============================================
// Types
// ============================================

export interface TableRowActionsProps<T> {
  /** The row data */
  row: T
  /** Callback when edit is clicked */
  onEdit?: (row: T) => void
  /** Callback when delete is clicked */
  onDelete?: (row: T) => void
  /** Callback when view is clicked */
  onView?: (row: T) => void
  /** Permission required to edit */
  editPermission?: string
  /** Permission required to delete */
  deletePermission?: string
  /** Permission required to view */
  viewPermission?: string
  /** Whether to show as dropdown menu (default: false for inline buttons) */
  asDropdown?: boolean
  /** Whether to show confirmation before delete */
  confirmDelete?: boolean
  /** Custom delete confirmation message */
  deleteConfirmMessage?: string
  /** Whether edit is disabled for this row */
  editDisabled?: boolean
  /** Whether delete is disabled for this row */
  deleteDisabled?: boolean
  /** Additional class name */
  className?: string
  /** Size of the buttons */
  size?: "sm" | "default"
}

// ============================================
// Component
// ============================================

export function TableRowActions<T>({
  row,
  onEdit,
  onDelete,
  onView,
  editPermission,
  deletePermission,
  viewPermission,
  asDropdown = false,
  confirmDelete = true,
  deleteConfirmMessage = "Are you sure you want to delete this item?",
  editDisabled = false,
  deleteDisabled = false,
  className,
  size = "sm",
}: TableRowActionsProps<T>) {
  const { hasPermission } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  // Check permissions
  const canEdit = onEdit && (!editPermission || hasPermission(editPermission))
  const canDelete = onDelete && (!deletePermission || hasPermission(deletePermission))
  const canView = onView && (!viewPermission || hasPermission(viewPermission))

  // If no actions are available, don't render anything
  if (!canEdit && !canDelete && !canView) {
    return null
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      confirm({
        title: "Delete Item",
        description: deleteConfirmMessage,
        destructive: true,
        onConfirm: () => {
          onDelete?.(row)
        },
      })
    } else {
      onDelete?.(row)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(row)
  }

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView?.(row)
  }

  // Dropdown menu variant
  if (asDropdown) {
    return (
      <div className={cn("flex justify-end", className)} onClick={(e) => e.stopPropagation()}>
        {ConfirmDialogElement}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canView && (
              <DropdownMenuItem onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onClick={handleEdit} disabled={editDisabled}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {canDelete && (canView || canEdit) && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteDisabled}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Inline buttons variant
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8"
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <div
      className={cn("flex items-center justify-end gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {ConfirmDialogElement}
      {canView && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "text-muted-foreground hover:text-foreground")}
          onClick={handleView}
          title="View"
        >
          <Eye className={iconSize} />
        </Button>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "text-muted-foreground hover:text-info")}
          onClick={handleEdit}
          disabled={editDisabled}
          title="Edit"
        >
          <Pencil className={iconSize} />
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "text-muted-foreground hover:text-destructive")}
          onClick={handleDelete}
          disabled={deleteDisabled}
          title="Delete"
        >
          <Trash2 className={iconSize} />
        </Button>
      )}
    </div>
  )
}

// ============================================
// Pre-configured Action Columns Helper
// ============================================

/**
 * Creates an actions column configuration for DataTable
 *
 * @example
 * const columns = [
 *   ...otherColumns,
 *   createActionsColumn({
 *     onEdit: (row) => router.push(`/tenants/${row.id}/edit`),
 *     onDelete: handleDelete,
 *     editPermission: "tenants.update",
 *     deletePermission: "tenants.delete",
 *   }),
 * ]
 */
export function createActionsColumn<T extends { id: string }>({
  onEdit,
  onDelete,
  onView,
  editPermission,
  deletePermission,
  viewPermission,
  asDropdown = false,
  confirmDelete = true,
  deleteConfirmMessage,
}: Omit<TableRowActionsProps<T>, "row" | "className" | "size">): {
  key: string
  header: string
  width: "actions" | "iconAction"
  canHide: boolean
  hideOnMobile: boolean
  render: (row: T) => React.ReactNode
} {
  return {
    key: "_actions",
    header: "",
    width: asDropdown ? "iconAction" : "actions",
    canHide: false,
    hideOnMobile: true,
    render: (row: T) => (
      <TableRowActions
        row={row}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        editPermission={editPermission}
        deletePermission={deletePermission}
        viewPermission={viewPermission}
        asDropdown={asDropdown}
        confirmDelete={confirmDelete}
        deleteConfirmMessage={deleteConfirmMessage}
      />
    ),
  }
}
