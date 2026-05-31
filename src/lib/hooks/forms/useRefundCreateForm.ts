"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useAuth } from "@/lib/auth"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { withCreatedBy } from "@/lib/audit"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

interface Tenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  entity_id: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
}

interface ExitClearance {
  id: string
  tenant_id: string
  total_refundable: number
  final_amount: number
  settlement_status: string
}

export function useRefundCreateForm() {
  const { user } = useAuth()
  const { backHref } = useBackNavigation({ defaultHref: "/refunds" })
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get("tenant")
  const exitClearanceId = searchParams.get("clearance")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [exitClearance, setExitClearance] = useState<ExitClearance | null>(null)

  const [formData, setFormData] = useState({
    tenant_id: tenantId || "",
    refund_type: "deposit_refund",
    amount: "",
    payment_mode: "cash",
    reference_number: "",
    refund_date: getTodayISO(),
    reason: "",
    notes: "",
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTenants()
    if (exitClearanceId) {
      // eslint-disable-next-line react-hooks/immutability
      fetchExitClearance(exitClearanceId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitClearanceId])

  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenant(tenant || null)
    }
  }, [formData.tenant_id, tenants])

  const fetchTenants = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        id, name, phone, photo_url, entity_id,
        property:properties(id, name),
        room:rooms(id, room_number)
      `)
      .in("status", ["active", "notice_period", "checked_out"])
      .order("name")

    if (error) {
      logger.error("Error fetching tenants:", { detail: error })
    } else {
      const transformed = (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        property: transformJoin(t.property as Record<string, unknown>[] | Record<string, unknown> | null),
        room: transformJoin(t.room as Record<string, unknown>[] | Record<string, unknown> | null),
      })) as Tenant[]
      setTenants(transformed)
      if (tenantId) {
        const tenant = transformed.find((t) => t.id === tenantId)
        if (tenant) setSelectedTenant(tenant)
      }
    }
    setLoading(false)
  }

  const fetchExitClearance = async (clearanceId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("exit_clearance")
      .select("id, tenant_id, total_refundable, final_amount, settlement_status")
      .eq("id", clearanceId)
      .single()

    if (error) {
      logger.error("Error fetching exit clearance:", { detail: error })
    } else if (data) {
      setExitClearance(data)
      setFormData((prev) => ({
        ...prev,
        tenant_id: data.tenant_id,
        amount: data.final_amount < 0 ? Math.abs(data.final_amount).toString() : data.total_refundable.toString(),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.amount) {
      showError("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      if (!user) {
        showError("Session expired. Please login again.")
        return
      }

      const supabase = createClient()

      const refundData = withCreatedBy({
        owner_id: user.id,
        tenant_id: formData.tenant_id,
        entity_id: selectedTenant?.entity_id || null,
        exit_clearance_id: exitClearanceId || null,
        refund_type: formData.refund_type,
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        refund_date: formData.refund_date || null,
        status: formData.refund_date ? "completed" : "pending",
        reason: formData.reason || null,
        notes: formData.notes || null,
        processed_by: formData.refund_date ? user.id : null,
        processed_at: formData.refund_date ? getNowISO() : null,
      }, user.id)

      const { error } = await supabase
        .from("refunds")
        .insert(refundData)
        .select()
        .single()

      if (error) {
        logger.error("Error creating refund:", { detail: error })
        showError(`Failed to create refund: ${error.message}`)
      } else {
        showSuccess("Refund recorded successfully")

        if (exitClearanceId) {
          await supabase
            .from("exit_clearance")
            .update({
              refund_status: formData.refund_date ? "completed" : "pending",
              refund_amount: parseFloat(formData.amount),
            })
            .eq("id", exitClearanceId)
        }

        if (selectedTenant && formData.refund_date) {
          try {
            const { data: tenantData } = await supabase
              .from("tenants")
              .select("email, person:people(email)")
              .eq("id", formData.tenant_id)
              .single()

            const email = tenantData?.person?.email || tenantData?.email
            if (email) {
              const { sendRefundProcessedEmail } = await import("@/lib/email")
              const { data: ownerProfile } = await supabase
                .from("user_profiles")
                .select("full_name, phone")
                .eq("user_id", user.id)
                .single()

              sendRefundProcessedEmail({
                to: email,
                tenantName: selectedTenant.name,
                amount: parseFloat(formData.amount),
                refundType: formData.refund_type,
                paymentMode: formData.payment_mode,
                reason: formData.reason || null,
                referenceNumber: formData.reference_number || null,
                refundDate: new Date(formData.refund_date),
                propertyName: selectedTenant.property?.name,
                ownerName: ownerProfile?.full_name || "Management",
                ownerPhone: ownerProfile?.phone || undefined,
              }).catch(() => {})
            }
          } catch {
            // non-blocking
          }
        }

        router.push("/refunds")
      }
    } catch (err) {
      handleClientError(err, "Creating refund")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    loading,
    submitting,
    tenants,
    selectedTenant,
    exitClearance,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    tenantId,
  }
}
