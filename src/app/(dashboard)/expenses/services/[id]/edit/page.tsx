/**
 * Edit Service Payment Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Hammer, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { transformJoin } from "@/lib/supabase/transforms"
import { toast } from "sonner"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { ServicePayment, ServiceProvider, ServiceCategory, ServicePaymentFormData, TdsSection, PaymentMode } from "@/types/expense-enhanced.types"

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
]

const TDS_SECTION_OPTIONS = [
  { value: "194C", label: "194C - Contractor (1%)" },
  { value: "194J", label: "194J - Professional (10%)" },
]

const TDS_RATES: Record<string, number> = {
  "194C": 1.0,
  "194J": 10.0,
}

export default function EditServicePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [payment, setPayment] = useState<ServicePayment | null>(null)

  const [formData, setFormData] = useState<ServicePaymentFormData>({
    provider_id: "",
    provider_name: "",
    category_id: "",
    category_name: "",
    service_date: "",
    description: "",
    gross_amount: 0,
    tds_applicable: false,
    tds_section: undefined,
    tds_rate: undefined,
    tds_amount: undefined,
    net_amount: undefined,
    payment_mode: undefined,
    payment_reference: "",
    payment_date: "",
    warranty_months: 0,
    notes: "",
  })

  // Load payment, providers, and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load providers
      const { data: providersData } = await supabase
        .from("service_providers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setProviders(providersData || [])

      // Load categories
      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])

      // Load payment
      const { data: paymentData, error } = await supabase
        .from("service_payments")
        .select(`
          *,
          provider:service_providers(id, name),
          category:service_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .single()

      if (error || !paymentData) {
        toast.error("Payment not found")
        router.push("/expenses/services")
        return
      }

      const transformed = {
        ...paymentData,
        provider: transformJoin(paymentData.provider),
        category: transformJoin(paymentData.category),
      } as ServicePayment

      setPayment(transformed)
      setFormData({
        provider_id: transformed.provider_id || "",
        provider_name: transformed.provider_name,
        category_id: transformed.category_id || "",
        category_name: transformed.category_name || "",
        service_date: transformed.service_date,
        description: transformed.description,
        gross_amount: transformed.gross_amount,
        tds_applicable: transformed.tds_applicable,
        tds_section: transformed.tds_section || undefined,
        tds_rate: transformed.tds_rate || undefined,
        tds_amount: transformed.tds_amount,
        net_amount: transformed.net_amount,
        payment_mode: transformed.payment_mode || undefined,
        payment_reference: transformed.payment_reference || "",
        payment_date: transformed.payment_date || "",
        warranty_months: transformed.warranty_months,
        notes: transformed.notes || "",
      })

      setLoadingData(false)
    }

    loadData()
  }, [workspaceId, id, router])

  // Calculate TDS when amount or rate changes
  useEffect(() => {
    if (formData.tds_applicable && formData.gross_amount > 0 && formData.tds_rate) {
      const tdsAmount = (formData.gross_amount * formData.tds_rate) / 100
      const netAmount = formData.gross_amount - tdsAmount
      setFormData((prev) => ({
        ...prev,
        tds_amount: tdsAmount,
        net_amount: netAmount,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        tds_amount: 0,
        net_amount: prev.gross_amount,
      }))
    }
  }, [formData.gross_amount, formData.tds_applicable, formData.tds_rate])

  // Handle provider selection
  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        provider_id: providerId,
        provider_name: provider.name,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        provider_id: "",
      }))
    }
  }

  // Handle TDS section change
  const handleTdsSectionChange = (section: string) => {
    setFormData((prev) => ({
      ...prev,
      tds_section: section as TdsSection,
      tds_rate: TDS_RATES[section] || prev.tds_rate,
    }))
  }

  // Calculate warranty expiry
  const getWarrantyExpiry = () => {
    if (formData.warranty_months && formData.warranty_months > 0 && formData.service_date) {
      const date = new Date(formData.service_date)
      date.setMonth(date.getMonth() + formData.warranty_months)
      return date.toISOString().split("T")[0]
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.provider_name.trim()) {
      toast.error("Provider name is required")
      return
    }

    if (!formData.description.trim()) {
      toast.error("Service description is required")
      return
    }

    if (formData.gross_amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const warrantyExpiry = getWarrantyExpiry()

      const { error } = await supabase
        .from("service_payments")
        .update({
          provider_id: formData.provider_id || null,
          provider_name: formData.provider_name.trim(),
          category_id: formData.category_id || null,
          category_name:
            categories.find((c) => c.id === formData.category_id)?.name ||
            formData.category_name ||
            null,
          service_date: formData.service_date,
          description: formData.description.trim(),
          gross_amount: formData.gross_amount,
          tds_applicable: formData.tds_applicable,
          tds_section: formData.tds_applicable ? formData.tds_section : null,
          tds_rate: formData.tds_applicable ? formData.tds_rate : null,
          tds_amount: formData.tds_amount || 0,
          net_amount: formData.net_amount || formData.gross_amount,
          payment_mode: formData.payment_mode || null,
          payment_reference: formData.payment_reference?.trim() || null,
          payment_date: formData.payment_date || null,
          warranty_months: formData.warranty_months || 0,
          warranty_expiry: warrantyExpiry,
          notes: formData.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      toast.success("Service payment updated")
      router.push(`/expenses/services/${id}`)
    } catch (error) {
      console.error("Failed to update service payment:", error)
      toast.error("Failed to update")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  if (!payment) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Payment not found"
          description="The service payment you're looking for doesn't exist."
          action={{
            label: "Back to Services",
            href: "/expenses/services",
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
            href={`/expenses/services/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Payment
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Hammer className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Edit Service Payment</CardTitle>
                    <CardDescription>Update payment details</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Provider & Category */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Provider Details</h3>

                  <FormField label="Service Provider">
                    <Select
                      value={formData.provider_id || ""}
                      onChange={(e) => handleProviderSelect(e.target.value)}
                      options={[
                        { value: "", label: "Select provider or enter name below" },
                        ...providers.map((p) => ({
                          value: p.id,
                          label: p.name,
                        })),
                      ]}
                    />
                    {!formData.provider_id && (
                      <Input
                        value={formData.provider_name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, provider_name: e.target.value }))
                        }
                        placeholder="Or enter provider name"
                        className="mt-2"
                      />
                    )}
                  </FormField>

                  <FormField label="Category">
                    <Select
                      value={formData.category_id || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                      }
                      options={[
                        { value: "", label: "Select category" },
                        ...categories.map((c) => ({
                          value: c.id,
                          label: c.name_hi ? `${c.name} (${c.name_hi})` : c.name,
                        })),
                      ]}
                    />
                  </FormField>
                </div>

                {/* Service Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Service Details</h3>

                  <FormField label="Service Date" required>
                    <Input
                      type="date"
                      value={formData.service_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, service_date: e.target.value }))
                      }
                    />
                  </FormField>

                  <FormField label="Description" required>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="What work was done?"
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Warranty (months)">
                    <Input
                      type="number"
                      min="0"
                      value={formData.warranty_months || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          warranty_months: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </FormField>
                </div>

                {/* Amount & TDS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Amount & TDS</h3>

                  <FormField label="Gross Amount" required>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.gross_amount || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gross_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </FormField>

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
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="tds_applicable" className="text-sm font-medium">
                        TDS Applicable
                      </label>
                    </div>

                    {formData.tds_applicable && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <div className="text-xs text-muted-foreground">TDS Deducted</div>
                            <div className="font-medium">
                              ₹{(formData.tds_amount || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Net Payable</div>
                            <div className="font-bold text-green-600">
                              ₹{(formData.net_amount || formData.gross_amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Payment Details</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Payment Mode">
                      <Select
                        value={formData.payment_mode || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_mode: e.target.value as PaymentMode,
                          }))
                        }
                        options={[
                          { value: "", label: "Select mode" },
                          ...PAYMENT_MODE_OPTIONS,
                        ]}
                      />
                    </FormField>

                    <FormField label="Payment Date">
                      <Input
                        type="date"
                        value={formData.payment_date || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, payment_date: e.target.value }))
                        }
                      />
                    </FormField>
                  </div>

                  <FormField label="Reference Number">
                    <Input
                      value={formData.payment_reference || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))
                      }
                      placeholder="Transaction ID"
                    />
                  </FormField>
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/expenses/services/${id}`)}
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
