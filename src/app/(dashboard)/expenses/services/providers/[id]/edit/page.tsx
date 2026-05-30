/**
 * Edit Service Provider Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Wrench, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import type { ServiceProvider, ServiceCategory, ServiceProviderFormData, TdsSection } from "@/types/expense-enhanced.types"
import { TDS_SECTION_OPTIONS, TDS_RATES } from "@/lib/constants/form-options"
import { logger } from "@/lib/logger"

export default function EditServiceProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditServiceProviderContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditServiceProviderContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services/providers" })
  const router = useRouter()
  const { user: _user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [provider, setProvider] = useState<ServiceProvider | null>(null)

  const [formData, setFormData] = useState<ServiceProviderFormData>({
    name: "",
    category_id: "",
    phone: "",
    alternate_phone: "",
    email: "",
    address: "",
    pan: "",
    gstin: "",
    upi_id: "",
    tds_applicable: false,
    tds_section: undefined,
    tds_rate: undefined,
    is_active: true,
    notes: "",
  })

  // Load provider and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load categories
      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      // Load provider
      const { data: providerData, error } = await supabase
        .from("service_providers")
        .select(`
          *,
          category:service_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !providerData) {
        showError("Provider not found")
        router.push("/expenses/services/providers")
        return
      }

      const transformed = {
        ...providerData,
        category: transformJoin(providerData.category),
      } as ServiceProvider

      setProvider(transformed)
      setFormData({
        name: transformed.name,
        category_id: transformed.category_id || "",
        phone: transformed.phone || "",
        alternate_phone: transformed.alternate_phone || "",
        email: transformed.email || "",
        address: transformed.address || "",
        pan: transformed.pan || "",
        gstin: transformed.gstin || "",
        upi_id: transformed.upi_id || "",
        tds_applicable: transformed.tds_applicable,
        tds_section: transformed.tds_section || undefined,
        tds_rate: transformed.tds_rate || undefined,
        is_active: transformed.is_active,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  // Handle TDS section change
  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || prev.tds_rate,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Provider name is required")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("service_providers")
        .update({
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          phone: formData.phone?.trim() || null,
          alternate_phone: formData.alternate_phone?.trim() || null,
          email: formData.email?.trim() || null,
          address: formData.address?.trim() || null,
          pan: formData.pan?.trim().toUpperCase() || null,
          gstin: formData.gstin?.trim().toUpperCase() || null,
          upi_id: formData.upi_id?.trim() || null,
          tds_applicable: formData.tds_applicable || false,
          tds_section: formData.tds_applicable ? formData.tds_section : null,
          tds_rate: formData.tds_applicable ? formData.tds_rate : null,
          is_active: formData.is_active ?? true,
          notes: formData.notes?.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", id)

      if (error) throw error

      showSuccess("Provider updated successfully")
      router.push(`/expenses/services/providers/${id}`)
    } catch (error) {
      logger.error("Failed to update provider:", { detail: error })
      showError("Failed to update provider")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Provider
      </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Edit Provider</CardTitle>
                    <CardDescription>Update service provider details</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

                  <FormField label="Provider Name" required>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Ramesh Plumber"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Phone">
                      <Input
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="10-digit mobile"
                      />
                    </FormField>

                    <FormField label="Alternate Phone">
                      <Input
                        value={formData.alternate_phone || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, alternate_phone: e.target.value }))
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="PAN">
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

                    <FormField label="GSTIN">
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
                  </div>

                  {/* TDS Settings */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="tds_applicable"
                        checked={formData.tds_applicable}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            tds_applicable: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <label htmlFor="tds_applicable" className="text-sm font-medium">
                        TDS Applicable
                      </label>
                    </div>

                    {formData.tds_applicable && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="TDS Section">
                          <Select
                            value={formData.tds_section || ""}
                            onChange={(e) => handleTdsSectionChange(e.target.value)}
                            options={[
                              { value: "", label: "Select section" },
                              ...TDS_SECTION_OPTIONS,
                            ]}
                          />
                        </FormField>

                        <FormField label="TDS Rate (%)">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.tds_rate || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                tds_rate: parseFloat(e.target.value) || undefined,
                              }))
                            }
                            placeholder="0.0"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Info */}
                <FormField label="UPI ID">
                  <Input
                    value={formData.upi_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, upi_id: e.target.value }))
                    }
                    placeholder="name@bank"
                  />
                </FormField>

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
                onClick={() => router.push(`/expenses/services/providers/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
      </form>
    </div>
  )
}
