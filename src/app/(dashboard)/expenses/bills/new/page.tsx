/**
 * New Bill Payment Page
 *
 * Form to record a new bill payment with GST breakdown.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Receipt, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input, Select, FormField, Textarea } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import { getTodayISO } from "@/lib/date-helpers"
import { EXPENSE_PAYMENT_MODE_OPTIONS as PAYMENT_MODE_OPTIONS, EXPENSE_BILL_STATUS_OPTIONS as STATUS_OPTIONS } from "@/lib/status"
import type { Vendor, BillCategory, BillPaymentFormData } from "@/types/expense-enhanced.types"

export default function NewBillPaymentPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [showGstFields, setShowGstFields] = useState(false)

  const [formData, setFormData] = useState<BillPaymentFormData>({
    vendor_id: "",
    vendor_name: "",
    category_id: "",
    category_name: "",
    bill_number: "",
    bill_period: "",
    bill_date: getTodayISO(),
    due_date: "",
    bill_amount: 0,
    base_amount: undefined,
    gst_amount: undefined,
    cgst: undefined,
    sgst: undefined,
    igst: undefined,
    hsn_code: "",
    paid_amount: undefined,
    payment_date: "",
    payment_mode: undefined,
    payment_reference: "",
    status: "pending",
    notes: "",
  })

  // Load vendors and categories
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setVendors(vendorsData || [])

      // Load bill categories
      const { data: categoriesData } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      setCategories(categoriesData || [])
      setLoadingData(false)
    }

    loadData()
  }, [workspaceId])

  // Handle vendor selection
  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId)
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
      category_id: vendor?.category_id || prev.category_id,
    }))
  }

  // Calculate GST breakdown
  const calculateGst = (baseAmount: number, gstPercent: number, isIgst: boolean) => {
    const gstAmount = (baseAmount * gstPercent) / 100
    if (isIgst) {
      setFormData((prev) => ({
        ...prev,
        base_amount: baseAmount,
        gst_amount: gstAmount,
        igst: gstAmount,
        cgst: undefined,
        sgst: undefined,
        bill_amount: baseAmount + gstAmount,
      }))
    } else {
      const halfGst = gstAmount / 2
      setFormData((prev) => ({
        ...prev,
        base_amount: baseAmount,
        gst_amount: gstAmount,
        cgst: halfGst,
        sgst: halfGst,
        igst: undefined,
        bill_amount: baseAmount + gstAmount,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vendor_name.trim()) {
      showError("Vendor name is required")
      return
    }

    if (formData.bill_amount <= 0) {
      showError("Bill amount must be greater than 0")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    // Auto-set status based on payment
    let status = formData.status
    if (formData.paid_amount && formData.payment_date) {
      if (formData.paid_amount >= formData.bill_amount) {
        status = "paid"
      } else if (formData.paid_amount > 0) {
        status = "partial"
      }
    }

    // Check if overdue
    if (status === "pending" && formData.due_date) {
      const dueDate = new Date(formData.due_date)
      if (dueDate < new Date()) {
        status = "overdue"
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const billData = withCreatedBy(
        {
          workspace_id: workspaceId,
          vendor_id: formData.vendor_id || null,
          vendor_name: formData.vendor_name.trim(),
          category_id: formData.category_id || null,
          category_name:
            categories.find((c) => c.id === formData.category_id)?.name ||
            formData.category_name ||
            null,
          bill_number: formData.bill_number?.trim() || null,
          bill_period: formData.bill_period?.trim() || null,
          bill_date: formData.bill_date || null,
          due_date: formData.due_date || null,
          bill_amount: formData.bill_amount,
          base_amount: formData.base_amount || null,
          gst_amount: formData.gst_amount || null,
          cgst: formData.cgst || null,
          sgst: formData.sgst || null,
          igst: formData.igst || null,
          hsn_code: formData.hsn_code?.trim() || null,
          paid_amount: formData.paid_amount || null,
          payment_date: formData.payment_date || null,
          payment_mode: formData.payment_mode || null,
          payment_reference: formData.payment_reference?.trim() || null,
          status,
          notes: formData.notes?.trim() || null,
        },
        user.id
      )

      const { data, error } = await supabase
        .from("bill_payments")
        .insert(billData)
        .select()
        .single()

      if (error) throw error

      showSuccess("Bill recorded successfully")
      router.push(`/expenses/bills/${data.id}`)
    } catch (error) {
      console.error("Failed to create bill:", error)
      showError("Failed to create bill")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.create">
        <div className="max-w-2xl mx-auto py-6">
          {/* Back Link */}
          <Link
            href="/expenses/bills"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Bills
          </Link>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <CardTitle>New Bill Payment</CardTitle>
                    <CardDescription>
                      Record a vendor bill or recurring expense
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Vendor Selection */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Vendor Details</h3>

                  <FormField label="Vendor">
                    <Select
                      value={formData.vendor_id || ""}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      options={[
                        { value: "", label: "Select vendor or enter name below" },
                        ...vendors.map((v) => ({
                          value: v.id,
                          label: v.name,
                        })),
                      ]}
                    />
                    {!formData.vendor_id && (
                      <Input
                        value={formData.vendor_name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, vendor_name: e.target.value }))
                        }
                        placeholder="Or enter vendor name"
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

                {/* Bill Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Bill Details</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Bill Number">
                      <Input
                        value={formData.bill_number || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bill_number: e.target.value }))
                        }
                        placeholder="e.g., INV-001"
                      />
                    </FormField>

                    <FormField label="Bill Period" hint="e.g., Jan 2026">
                      <Input
                        value={formData.bill_period || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bill_period: e.target.value }))
                        }
                        placeholder="Jan 2026"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Bill Date">
                      <Input
                        type="date"
                        value={formData.bill_date || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bill_date: e.target.value }))
                        }
                      />
                    </FormField>

                    <FormField label="Due Date">
                      <Input
                        type="date"
                        value={formData.due_date || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                        }
                      />
                    </FormField>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showGstFields}
                        onChange={(e) => setShowGstFields(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      GST Breakdown
                    </label>
                  </div>

                  {!showGstFields ? (
                    <FormField label="Bill Amount" required>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.bill_amount || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bill_amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </FormField>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Base Amount">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.base_amount || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                base_amount: parseFloat(e.target.value) || undefined,
                              }))
                            }
                            placeholder="0.00"
                          />
                        </FormField>

                        <FormField label="HSN Code">
                          <Input
                            value={formData.hsn_code || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, hsn_code: e.target.value }))
                            }
                            placeholder="e.g., 9961"
                          />
                        </FormField>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField label="CGST">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.cgst || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                cgst: parseFloat(e.target.value) || undefined,
                              }))
                            }
                            placeholder="0.00"
                          />
                        </FormField>

                        <FormField label="SGST">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.sgst || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                sgst: parseFloat(e.target.value) || undefined,
                              }))
                            }
                            placeholder="0.00"
                          />
                        </FormField>

                        <FormField label="IGST">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.igst || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                igst: parseFloat(e.target.value) || undefined,
                              }))
                            }
                            placeholder="0.00"
                          />
                        </FormField>
                      </div>

                      <FormField label="Total Bill Amount" required>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.bill_amount || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              bill_amount: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="0.00"
                        />
                      </FormField>
                    </>
                  )}
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Payment Details (Optional)
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Paid Amount">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.paid_amount || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paid_amount: parseFloat(e.target.value) || undefined,
                          }))
                        }
                        placeholder="0.00"
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Payment Mode">
                      <Select
                        value={formData.payment_mode || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_mode: e.target.value as BillPaymentFormData["payment_mode"],
                          }))
                        }
                        options={[
                          { value: "", label: "Select mode" },
                          ...PAYMENT_MODE_OPTIONS,
                        ]}
                      />
                    </FormField>

                    <FormField label="Reference Number">
                      <Input
                        value={formData.payment_reference || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_reference: e.target.value,
                          }))
                        }
                        placeholder="Transaction ID"
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/expenses/bills")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Bill"}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
