/**
 * Edit Vendor Page
 */

"use client"

import { use } from "react"
import { Building2 } from "lucide-react"
import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { useVendorEditForm } from "@/lib/hooks/forms/useVendorEditForm"

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ModuleGuard module="expenses">
      <PermissionGuard permission="expenses.edit">
        <EditVendorContent params={params} />
      </PermissionGuard>
    </ModuleGuard>
  )
}

function EditVendorContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    loading,
    loadingData,
    categories,
    vendor,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    router,
  } = useVendorEditForm(id)

  if (loadingData) {
    return <PageLoading />
  }

  if (!vendor) {
    return <NotFoundState title="Vendor not found" backHref="/expenses/vendors" backLabel="All Vendors" />
  }

  return (
    <div className="space-y-6">
      <DetailHero
        title="Edit Vendor"
        subtitle="Update vendor details"
        backHref={backHref}
        backLabel="All Vendors"
        icon={Building2}
        breadcrumbs={[{label:"Expenses", href:"/expenses"}, {label:"Vendors", href:"/expenses/vendors"}, {label:"Edit Vendor"}]}
      />

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            <DetailSection title="Edit Vendor" description="Update vendor details" icon={Building2}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
  )
}
