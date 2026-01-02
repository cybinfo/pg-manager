"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PermissionGuard } from "@/components/auth"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { CreditCard, Plus, ArrowLeft, User } from "lucide-react"
import { formatDate } from "@/lib/format"

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string | null
  notes: string | null
  bill: { bill_number: string } | null
}

interface Tenant {
  id: string
  name: string
  property: { name: string } | null
  room: { room_number: string } | null
}

export default function TenantPaymentsPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      const supabase = createClient()

      // Fetch tenant details
      const { data: tenantData } = await supabase
        .from("tenants")
        .select(`
          id, name,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("id", tenantId)
        .single()

      if (tenantData) {
        const t = tenantData as {
          id: string; name: string;
          property: { name: string }[] | null;
          room: { room_number: string }[] | null
        }
        setTenant({
          id: t.id,
          name: t.name,
          property: Array.isArray(t.property) ? t.property[0] : t.property,
          room: Array.isArray(t.room) ? t.room[0] : t.room
        })
      }

      // Fetch payments for this tenant
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          id, amount, payment_date, payment_method, reference_number, notes,
          bill:bills(bill_number)
        `)
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })

      if (paymentsData) {
        const processed = paymentsData.map((p: {
          id: string; amount: number; payment_date: string; payment_method: string;
          reference_number: string | null; notes: string | null;
          bill: { bill_number: string }[] | null
        }) => ({
          ...p,
          bill: Array.isArray(p.bill) ? p.bill[0] : p.bill
        }))
        setPayments(processed)
        setTotalPaid(processed.reduce((sum, p) => sum + p.amount, 0))
      }

      setLoading(false)
    }

    fetchData()
  }, [user, tenantId])

  const columns: Column<Payment>[] = [
    {
      key: "payment_date",
      header: "Date",
      render: (payment) => formatDate(payment.payment_date)
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment) => <Currency amount={payment.amount} className="font-semibold text-emerald-600" />
    },
    {
      key: "payment_method",
      header: "Method",
      render: (payment) => (
        <span className="capitalize">{payment.payment_method.replace(/_/g, ' ')}</span>
      )
    },
    {
      key: "bill",
      header: "Bill",
      render: (payment) => payment.bill ? (
        <Link href={`/dashboard/bills/${payment.id}`} className="text-teal-600 hover:underline">
          {payment.bill.bill_number}
        </Link>
      ) : "-"
    },
    {
      key: "reference_number",
      header: "Reference",
      render: (payment) => payment.reference_number || "-"
    },
    {
      key: "actions",
      header: "",
      render: (payment) => (
        <Link href={`/dashboard/payments/${payment.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      )
    }
  ]

  if (loading) return <PageLoading />

  if (!tenant) {
    return (
      <EmptyState
        icon={User}
        title="Tenant not found"
        description="The tenant you're looking for doesn't exist."
        action={{ label: "Back to Tenants", href: "/dashboard/tenants" }}
      />
    )
  }

  return (
    <PermissionGuard permission="payments.view">
      <div className="space-y-6">
        <PageHeader
          title={`Payments from ${tenant.name}`}
          description={`Total paid: ₹${totalPaid.toLocaleString('en-IN')} • ${tenant.property?.name || ''} ${tenant.room ? `• Room ${tenant.room.room_number}` : ''}`}
          icon={CreditCard}
          breadcrumbs={[
            { label: "Tenants", href: "/dashboard/tenants" },
            { label: tenant.name, href: `/dashboard/tenants/${tenantId}` },
            { label: "Payments" }
          ]}
          actions={
            <div className="flex gap-2">
              <Link href={`/dashboard/tenants/${tenantId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tenant
                </Button>
              </Link>
              <Link href={`/dashboard/payments/new?tenant_id=${tenantId}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </Link>
            </div>
          }
        />

        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            description={`No payments have been recorded for ${tenant.name}.`}
            action={{ label: "Record Payment", href: `/dashboard/payments/new?tenant_id=${tenantId}` }}
          />
        ) : (
          <DataTable
            data={payments}
            columns={columns}
            keyField="id"
            searchable
            searchFields={["reference_number", "payment_method"]}
            searchPlaceholder="Search payments..."
          />
        )}
      </div>
    </PermissionGuard>
  )
}
