"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showError } from "@/lib/toast-helpers"
import { transformJoin } from "@/lib/supabase/transforms"
import { logger } from "@/lib/logger"
import { type TenantWithRentDues } from "@/types/payments.types"

export function usePaymentReminders() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<TenantWithRentDues[]>([])
  const [loading, setLoading] = useState(true)
  const [ownerName, setOwnerName] = useState("")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTenantsWithDues()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchTenantsWithDues = async () => {
    const supabase = createClient()

    if (!user) return

    // Get owner info
    const { data: ownerData } = await supabase
      .from("owners")
      .select("business_name, name")
      .eq("id", user.id)
      .single()

    setOwnerName(ownerData?.business_name || ownerData?.name || "ManageKar")

    // Get active tenants with their property and room info
    const { data: tenantsData, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        name,
        phone,
        email,
        monthly_rent,
        check_in_date,
        property:properties(id, name),
        room:rooms(id, room_number)
      `)
      .eq("status", "active")
      .order("name")

    if (tenantsError) {
      logger.error("Error fetching tenants:", { detail: tenantsError })
      showError("Failed to load tenants")
      setLoading(false)
      return
    }

    // Get all payments for these tenants
    const tenantIds = tenantsData?.map((t: { id: string }) => t.id) || []
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("tenant_id, amount, payment_date")
      .in("tenant_id", tenantIds)

    // Calculate dues for each tenant
    type RawTenant = {
      id: string
      name: string
      phone: string
      email: string | null
      monthly_rent: number
      check_in_date: string
      property: TenantWithRentDues["property"] | TenantWithRentDues["property"][]
      room: TenantWithRentDues["room"] | TenantWithRentDues["room"][]
    }
    const now = new Date()
    const tenantsWithDues: TenantWithRentDues[] = ((tenantsData || []) as RawTenant[]).map((tenant) => {
      // Transform arrays to single objects (Supabase join pattern)
      const property = transformJoin(tenant.property) as TenantWithRentDues["property"]
      const room = transformJoin(tenant.room) as TenantWithRentDues["room"]

      // Calculate months active
      const checkIn = new Date(tenant.check_in_date)
      const monthsActive = Math.max(1, Math.ceil(
        (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ))

      // Calculate expected rent (months * monthly_rent)
      const expectedRent = monthsActive * Number(tenant.monthly_rent)

      // Calculate total paid
      const tenantPayments = paymentsData?.filter((p: { tenant_id: string }) => p.tenant_id === tenant.id) || []
      const totalPaid = tenantPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

      // Calculate pending dues
      const pendingDues = Math.max(0, expectedRent - totalPaid)

      // Get last payment date
      const sortedPayments = tenantPayments.sort(
        (a: { payment_date: string }, b: { payment_date: string }) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )
      const lastPaymentDate = sortedPayments[0]?.payment_date || null

      return {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        monthly_rent: Number(tenant.monthly_rent),
        check_in_date: tenant.check_in_date,
        property,
        room,
        totalPaid,
        expectedRent,
        pendingDues,
        monthsActive,
        lastPaymentDate,
      }
    })

    // Filter to only show tenants with pending dues
    const tenantsWithPendingDues = tenantsWithDues.filter(t => t.pendingDues > 0)

    // Sort by pending dues (highest first)
    tenantsWithPendingDues.sort((a, b) => b.pendingDues - a.pendingDues)

    setTenants(tenantsWithPendingDues)
    setLoading(false)
  }

  return {
    tenants,
    loading,
    ownerName,
  }
}
