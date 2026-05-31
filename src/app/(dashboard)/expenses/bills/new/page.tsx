"use client"

import { Receipt } from "lucide-react"
import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { DetailHero, DetailSection } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { DatePicker } from "@/components/ui/date-picker"
import { useExpenseBillCreate, PAYMENT_MODE_OPTIONS } from "@/lib/hooks/forms/useExpenseBillCreate"
import type { BillPaymentFormData } from "@/types/expense-enhanced.types"

export default function NewBillPaymentPage() {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.create">
        <NewBillPaymentContent />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function NewBillPaymentContent() {
  const {
    backHref,
    router,
    loading,
    loadingData,
    vendors,
    categories,
    showGstFields,
    setShowGstFields,
    formData,
    setFormData,
    handleVendorSelect,
    handleSubmit,
  } = useExpenseBillCreate()

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="New Bill Payment"
        subtitle="Record a vendor bill or recurring expense"
        backHref={backHref}
        backLabel="All Bills"
        icon={Receipt}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Bills", href:"/expenses/bills"}, {label:"Add Bill"}]}
      />

          <form onSubmit={handleSubmit} className="space-y-6">
            <DetailSection title="New Bill Payment" description="Record a vendor bill or recurring expense" icon={Receipt}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Bill Date">
                      <DatePicker
                        value={formData.bill_date || ""}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, bill_date: val }))
                        }
                        placeholder="Pick a date"
                      />
                    </FormField>

                    <FormField label="Due Date">
                      <DatePicker
                        value={formData.due_date || ""}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, due_date: val }))
                        }
                        placeholder="Pick a date"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                    <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                      <Checkbox
                        checked={showGstFields}
                        onCheckedChange={(checked) => setShowGstFields(checked === true)}
                      />
                      GST Breakdown
                    </Label>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <DatePicker
                        value={formData.payment_date || ""}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, payment_date: val }))
                        }
                        placeholder="Pick a date"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </DetailSection>

            {/* Actions */}
            <div className="flex justify-end gap-3">
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
  )
}
