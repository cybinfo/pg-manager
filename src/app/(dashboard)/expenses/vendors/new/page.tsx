/**
 * New Vendor Page
 *
 * Form to create a new vendor/supplier.
 * Uses useFormPage hook + FormPageTemplate for consistent layout.
 */

"use client"

import { useState, useEffect } from "react"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { requiredField } from "@/lib/validation"

import {
  FormPageTemplate,
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
  Label,
} from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { PageLoading } from "@/components/ui/loading"

import type { BillCategory } from "@/types/expense-enhanced.types"
import { PermissionGuard } from "@/components/auth"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

export default function NewVendorPage() {
  return (
    <PermissionGuard permission="expenses.create">
      <NewVendorContent />
    </PermissionGuard>
  )
}

function NewVendorContent() {
  const { workspaceId } = useAuthContext()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/expenses/vendors", defaultLabel: "Vendors" })
  const [categories, setCategories] = useState<BillCategory[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    formData,
    setFormData,
    handleSubmit,
    saving,
    errors,
    validateField,
    user,
    router,
  } = useFormPage({
    table: "vendors",
    initialData: {
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
      is_active: true as boolean,
      notes: "",
    },
    redirectTo: "/expenses/vendors",
    addOwnerId: false,
    selectAfterInsert: true,
    successMessage: "Vendor created successfully",
    errorMessage: "Failed to create vendor",
    validationSchema: {
      name: requiredField("Vendor name"),
    },
    transform: (data) => ({
      workspace_id: workspaceId,
      name: String(data.name).trim(),
      category_id: data.category_id || null,
      contact_name: data.contact_name ? String(data.contact_name).trim() : null,
      phone: data.phone ? String(data.phone).trim() : null,
      email: data.email ? String(data.email).trim() : null,
      address: data.address ? String(data.address).trim() : null,
      gstin: data.gstin ? String(data.gstin).trim().toUpperCase() : null,
      pan: data.pan ? String(data.pan).trim().toUpperCase() : null,
      upi_id: data.upi_id ? String(data.upi_id).trim() : null,
      bank_name: data.bank_name ? String(data.bank_name).trim() : null,
      bank_account: data.bank_account ? String(data.bank_account).trim() : null,
      bank_ifsc: data.bank_ifsc ? String(data.bank_ifsc).trim().toUpperCase() : null,
      is_active: data.is_active ?? true,
      notes: data.notes ? String(data.notes).trim() : null,
    }),
    onSuccess: (data) => {
      if (data?.id) return `/expenses/vendors/${data.id}`
    },
  })

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()

      const { data, error } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      if (error) {
        logger.error("Failed to load categories:", { detail: error })
        await seedDefaultCategories()
      } else {
        setCategories(data || [])
        if (!data || data.length === 0) {
          await seedDefaultCategories()
        }
      }
      setLoadingData(false)
    }

    async function seedDefaultCategories() {
      if (!workspaceId || !user?.id) return

      const supabase = createClient()
      const { error } = await supabase.rpc("seed_expense_categories", {
        p_workspace_id: workspaceId,
        p_user_id: user.id,
      })

      if (error) {
        logger.error("Failed to seed categories:", { detail: error })
      } else {
        const { data } = await supabase
          .from("bill_categories")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .order("sort_order")

        setCategories(data || [])
      }
    }

    loadCategories()
  }, [workspaceId, user?.id])

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FormPageTemplate
      title="New Vendor"
      description="Add a new vendor/supplier for bill payments"
      icon={Building2}
      iconColor="purple"
      backHref={backHref}
      backLabel={backLabel}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/expenses/vendors")}
      submitLabel="Create Vendor"
      loading={saving}
      loadingLabel="Creating..."
      permission="expenses.create"
      module="expenses"
    >
      {/* Basic Info */}
      <FormSection title="Basic Information">
        <FormField label="Vendor Name" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            onBlur={() => validateField("name")}
            placeholder="e.g., ABC Electricals"
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
      </FormSection>

      {/* Contact Info */}
      <FormSection title="Contact Information">
        <FormGrid cols={2}>
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
        </FormGrid>

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
      </FormSection>

      {/* Tax Info */}
      <FormSection title="Tax Information">
        <FormGrid cols={2}>
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
        </FormGrid>
      </FormSection>

      {/* Payment Info */}
      <FormSection title="Payment Details">
        <FormField label="UPI ID" hint="For quick payments">
          <Input
            value={formData.upi_id || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, upi_id: e.target.value }))
            }
            placeholder="name@bank"
          />
        </FormField>

        <FormGrid cols={3}>
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
        </FormGrid>
      </FormSection>

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
    </FormPageTemplate>
  )
}
