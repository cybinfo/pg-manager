/**
 * New Service Provider Page
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wrench } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { DetailHero, DetailSection } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"

import type { ServiceCategory, ServiceProviderFormData, TdsSection } from "@/types/expense-enhanced.types"
import { TDS_SECTION_OPTIONS, TDS_RATES } from "@/lib/constants/form-options"
import { logger } from "@/lib/logger"

export default function NewServiceProviderPage() {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.create">
        <NewServiceProviderContent />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function NewServiceProviderContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/expenses/services/providers" })
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<ServiceCategory[]>([])

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
    tds_applicable: false as boolean,
    tds_section: undefined,
    tds_rate: undefined,
    is_active: true as boolean,
    notes: "",
  })

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      if (error) {
        logger.error("Failed to load categories:", { detail: error })
      } else {
        setCategories(data || [])
      }
      setLoadingData(false)
    }

    loadCategories()
  }, [workspaceId])

  // Handle TDS section change
  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || undefined,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Provider name is required")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const providerData = withCreatedBy(
        {
          workspace_id: workspaceId,
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
        },
        user.id
      )

      const { data, error } = await supabase
        .from("service_providers")
        .insert(providerData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Provider created successfully")
      router.push(`/expenses/services/providers/${data.id}`)
    } catch (error) {
      logger.error("Failed to create provider:", { detail: error })
      showError("Failed to create provider")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="New Service Provider"
        subtitle="Add a plumber, electrician, carpenter, or other service provider"
        backHref={backHref}
        backLabel="All Providers"
        icon={Wrench}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Services", href:"/expenses/services"}, {label:"Providers", href:"/expenses/services/providers"}, {label:"Add Provider"}]}
      />

          <form onSubmit={handleSubmit} className="space-y-6">
            <DetailSection title="New Service Provider" description="Add a plumber, electrician, carpenter, or other service provider" icon={Wrench}>
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
                      autoFocus
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
                    <FormField label="Phone" hint="Primary contact">
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
                    <FormField label="PAN" hint="Required for TDS">
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
                      <Checkbox
                        id="tds_applicable"
                        checked={formData.tds_applicable as boolean}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            tds_applicable: checked === true,
                            tds_section: checked === true ? prev.tds_section : undefined,
                            tds_rate: checked === true ? prev.tds_rate : undefined,
                          }))
                        }
                      />
                      <Label htmlFor="tds_applicable" className="text-sm font-medium cursor-pointer">
                        TDS Applicable
                      </Label>
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
                <FormField label="UPI ID" hint="For quick payments">
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
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active as boolean}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked === true }))
                    }
                  />
                  <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">
                    Active (available for selection)
                  </Label>
                </div>
            </DetailSection>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/expenses/services/providers")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Provider"}
              </Button>
            </div>
          </form>
    </div>
  )
}
