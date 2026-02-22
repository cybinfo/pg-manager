/**
 * Edit Vendor Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { Vendor, BillCategory, VendorFormData } from "@/types/expense-enhanced.types"

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [vendor, setVendor] = useState<Vendor | null>(null)

  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    category_id: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    pan: "",
    upi_id: "",
    bank_name: "",
    bank_account: "",
    bank_ifsc: "",
    is_active: true,
    notes: "",
  })

  // Load vendor and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load categories
      const { data: categoriesData } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      // Load vendor
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(`
          *,
          category:bill_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !vendorData) {
        showError("Vendor not found")
        router.push("/expenses/vendors")
        return
      }

      const transformed = {
        ...vendorData,
        category: transformJoin(vendorData.category),
      } as Vendor

      setVendor(transformed)
      setFormData({
        name: transformed.name,
        category_id: transformed.category_id || "",
        contact_name: transformed.contact_name || "",
        phone: transformed.phone || "",
        email: transformed.email || "",
        address: transformed.address || "",
        gstin: transformed.gstin || "",
        pan: transformed.pan || "",
        upi_id: transformed.upi_id || "",
        bank_name: transformed.bank_name || "",
        bank_account: transformed.bank_account || "",
        bank_ifsc: transformed.bank_ifsc || "",
        is_active: transformed.is_active,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Vendor name is required")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("vendors")
        .update({
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          contact_name: formData.contact_name?.trim() || null,
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          address: formData.address?.trim() || null,
          gstin: formData.gstin?.trim().toUpperCase() || null,
          pan: formData.pan?.trim().toUpperCase() || null,
          upi_id: formData.upi_id?.trim() || null,
          bank_name: formData.bank_name?.trim() || null,
          bank_account: formData.bank_account?.trim() || null,
          bank_ifsc: formData.bank_ifsc?.trim().toUpperCase() || null,
          is_active: formData.is_active ?? true,
          notes: formData.notes?.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) {
        if (error.code === "23505") {
          showError("A vendor with this name already exists")
        } else {
          throw error
        }
        return
      }

      showSuccess("Vendor updated successfully")
      router.push(`/expenses/vendors/${id}`)
    } catch (error) {
      console.error("Failed to update vendor:", error)
      showError("Failed to update vendor")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (!vendor) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Vendor not found"
          description="The vendor you're looking for doesn't exist."
          action={{
            label: "Back to Vendors",
            href: "/expenses/vendors",
          }}
        />
      </div>
    )
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.edit">
        <div className="max-w-2xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href={`/expenses/vendors/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vendor
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Edit Vendor</CardTitle>
                    <CardDescription>Update vendor details</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

                  <FormField label="Vendor Name" required>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., ABC Electricals"
                    />
                  </FormField>

                  <FormField label="Category">
                    <Select
                      value={formData.category_id || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                      }
                      options={[
                        { value: "", label: "Select category" },
                        ...categories.map((cat) => ({
                          value: cat.id,
                          label: cat.name_hi ? `${cat.name} (${cat.name_hi})` : cat.name,
                        })),
                      ]}
                    />
                  </FormField>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Contact Person">
                      <Input
                        value={formData.contact_name || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contact_name: e.target.value }))
                        }
                        placeholder="Contact name"
                      />
                    </FormField>

                    <FormField label="Phone">
                      <Input
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="10-digit mobile"
                      />
                    </FormField>
                  </div>

                  <FormField label="Email">
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="email@example.com"
                    />
                  </FormField>

                  <FormField label="Address">
                    <Textarea
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Full address"
                      rows={2}
                    />
                  </FormField>
                </div>

                {/* Tax Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Tax Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="GSTIN" hint="15-character GST number">
                      <Input
                        value={formData.gstin || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, gstin: e.target.value }))
                        }
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className="uppercase"
                      />
                    </FormField>

                    <FormField label="PAN" hint="10-character PAN">
                      <Input
                        value={formData.pan || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, pan: e.target.value }))
                        }
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="uppercase"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Payment Details</h3>

                  <FormField label="UPI ID" hint="For quick payments">
                    <Input
                      value={formData.upi_id || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, upi_id: e.target.value }))
                      }
                      placeholder="name@bank"
                    />
                  </FormField>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Bank Name">
                      <Input
                        value={formData.bank_name || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bank_name: e.target.value }))
                        }
                        placeholder="Bank name"
                      />
                    </FormField>

                    <FormField label="Account Number">
                      <Input
                        value={formData.bank_account || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bank_account: e.target.value }))
                        }
                        placeholder="Account number"
                      />
                    </FormField>

                    <FormField label="IFSC Code">
                      <Input
                        value={formData.bank_ifsc || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bank_ifsc: e.target.value }))
                        }
                        placeholder="IFSC"
                        maxLength={11}
                        className="uppercase"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Notes */}
                <FormField label="Notes">
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </FormField>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="is_active" className="text-sm">
                    Active (available for selection)
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/expenses/vendors/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
