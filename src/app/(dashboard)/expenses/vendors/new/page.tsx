/**
 * New Vendor Page
 *
 * Form to create a new vendor/supplier.
 * Uses FormPageTemplate for consistent layout.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"

import {
  FormPageTemplate,
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import type { BillCategory, VendorFormData } from "@/types/expense-enhanced.types"

export default function NewVendorPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [categories, setCategories] = useState<BillCategory[]>([])

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

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!workspaceId) return

      const supabase = createClient()

      // Load bill categories
      const { data, error } = await supabase
        .from("bill_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order")

      if (error) {
        console.error("Failed to load categories:", error)
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
        console.error("Failed to seed categories:", error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError("Vendor name is required")
      return
    }

    if (!workspaceId || !user?.id) {
      showError("Session error. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const vendorData = withCreatedBy(
        {
          workspace_id: workspaceId,
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
        },
        user.id
      )

      const { data, error } = await supabase
        .from("vendors")
        .insert(vendorData)
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          showError("A vendor with this name already exists")
        } else {
          throw error
        }
        return
      }

      showSuccess("Vendor created successfully")
      router.push(`/expenses/vendors/${data.id}`)
    } catch (error) {
      console.error("Failed to create vendor:", error)
      showError("Failed to create vendor")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <FormPageTemplate
      title="New Vendor"
      description="Add a new vendor/supplier for bill payments"
      icon={Building2}
      iconColor="purple"
      backHref="/expenses/vendors"
      backLabel="Back to Vendors"
      onSubmit={handleSubmit}
      onCancel={() => router.push("/expenses/vendors")}
      submitLabel="Create Vendor"
      loading={loading}
      loadingLabel="Creating..."
      permission="expenses.create"
      feature="expenses"
    >
      {/* Basic Info */}
      <FormSection title="Basic Information">
        <FormField label="Vendor Name" required>
          <Input
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
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
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
          }
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="is_active" className="text-sm">
          Active (available for selection)
        </label>
      </div>
    </FormPageTemplate>
  )
}
