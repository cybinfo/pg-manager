/**
 * New Service Provider Page
 */

"use client"

import { Wrench } from "lucide-react"
import { PermissionGuard, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input, Select, FormField, Textarea, Label } from "@/components/ui"
import { DetailHero, DetailSection } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"
import { TDS_SECTION_OPTIONS } from "@/lib/constants/form-options"
import { useServiceProviderCreateForm } from "@/lib/hooks/forms/useServiceProviderCreateForm"

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
  const {
    loading,
    loadingData,
    categories,
    formData,
    setFormData,
    handleTdsSectionChange,
    handleSubmit,
    backHref,
    router,
  } = useServiceProviderCreateForm()

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
