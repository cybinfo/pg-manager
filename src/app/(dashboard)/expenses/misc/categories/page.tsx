/**
 * Miscellaneous Transaction Categories Management Page
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Edit,
  Trash2,
  GripVertical,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { PageHeader, TableBadge, EmptyState } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { MiscTransactionCategory, MiscTransactionType } from "@/types/expense-enhanced.types"

type CategoryFormData = {
  name: string
  name_hi: string
  default_type: MiscTransactionType | "both"
}

export default function MiscCategoriesPage() {
  const { user } = useAuth()
  const { workspaceId } = useAuthContext()

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MiscTransactionCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    name_hi: "",
    default_type: "both",
  })

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!workspaceId) return

    const supabase = createClient()

    const { data, error } = await supabase
      .from("misc_transaction_categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("sort_order")

    if (error) {
      console.error("Failed to load categories:", error)
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const openAddDialog = () => {
    setEditingCategory(null)
    setFormData({ name: "", name_hi: "", default_type: "both" })
    setDialogOpen(true)
  }

  const openEditDialog = (category: MiscTransactionCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      name_hi: category.name_hi || "",
      default_type: category.default_type,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError("Category name is required")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      if (editingCategory) {
        // Update existing
        const { error } = await supabase
          .from("misc_transaction_categories")
          .update({
            name: formData.name.trim(),
            name_hi: formData.name_hi.trim() || null,
            default_type: formData.default_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id)

        if (error) throw error
        showSuccess("Category updated")
      } else {
        // Create new
        const maxSort = Math.max(0, ...categories.map((c) => c.sort_order || 0))

        const { error } = await supabase
          .from("misc_transaction_categories")
          .insert({
            workspace_id: workspaceId,
            name: formData.name.trim(),
            name_hi: formData.name_hi.trim() || null,
            default_type: formData.default_type,
            sort_order: maxSort + 1,
            created_by: user.id,
          })

        if (error) throw error
        showSuccess("Category created")
      }

      setDialogOpen(false)
      loadCategories()
    } catch (error) {
      console.error("Failed to save category:", error)
      showError("Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (category: MiscTransactionCategory) => {
    if (!user?.id) return

    confirm({
      title: "Delete Category",
      description: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("misc_transaction_categories", category.id, user.id)
          if (!result.error) {
            showSuccess("Category deleted")
            loadCategories()
          } else {
            showError(result.error.message || "Failed to delete")
          }
        } catch (error) {
          console.error("Failed to delete:", error)
          showError("Failed to delete")
        }
      },
    })
  }

  const handleToggleActive = async (category: MiscTransactionCategory) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("misc_transaction_categories")
        .update({
          is_active: !category.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", category.id)

      if (error) throw error
      showSuccess(category.is_active ? "Category deactivated" : "Category activated")
      loadCategories()
    } catch (error) {
      console.error("Failed to toggle category:", error)
      showError("Failed to update category")
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowDownLeft className="h-4 w-4 text-success" />
      case "out":
        return <ArrowUpRight className="h-4 w-4 text-destructive" />
      default:
        return <ArrowLeftRight className="h-4 w-4 text-info" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "in":
        return "Money In"
      case "out":
        return "Money Out"
      default:
        return "Both"
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="space-y-6">
          {ConfirmDialogElement}
          {/* Back Link */}
          <Link
            href="/expenses/misc"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Transactions
          </Link>

          <PageHeader
            title="Transaction Categories"
            description="Manage categories for miscellaneous transactions"
            actions={
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            }
          />

          {categories.length === 0 ? (
            <EmptyState
              title="No categories"
              description="Create categories to organize your miscellaneous transactions"
              action={{
                label: "Add Category",
                onClick: openAddDialog,
              }}
            />
          ) : (
            <div className="bg-card rounded-lg border divide-y">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center gap-4 px-4 py-3 ${
                    !category.is_active ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {category.name_hi && (
                        <span className="text-muted-foreground">({category.name_hi})</span>
                      )}
                      {!category.is_active && (
                        <TableBadge variant="muted">Inactive</TableBadge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getTypeIcon(category.default_type)}
                    <span className="text-sm text-muted-foreground">
                      {getTypeLabel(category.default_type)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(category)}
                    >
                      {category.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., PG Collection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_hi">Name (Hindi)</Label>
                  <Input
                    id="name_hi"
                    value={formData.name_hi}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name_hi: e.target.value }))
                    }
                    placeholder="e.g., पीजी संग्रह"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="flex gap-2">
                    {(["both", "in", "out"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, default_type: type }))
                        }
                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                          formData.default_type === type
                            ? type === "in"
                              ? "border-success bg-success/10"
                              : type === "out"
                              ? "border-destructive bg-destructive/10"
                              : "border-info bg-info/10"
                            : "border-border hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {getTypeIcon(type)}
                          <span className="text-sm font-medium">
                            {getTypeLabel(type)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose which transaction types this category applies to
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingCategory ? "Save Changes" : "Add Category"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
