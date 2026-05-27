"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PermissionGuard } from "@/components/auth"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageSkeleton } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Receipt, Plus, ArrowLeft, User } from "lucide-react"
import { formatDate } from "@/lib/format"
import { dateColumn } from "@/lib/columns"
import { transformJoin } from "@/lib/supabase/transforms"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
  billing_period_start: string
  billing_period_end: string
}

interface Tenant {
  id: string
  name: string
  property: { name: string } | null
  room: { room_number: string } | null
}

export default function TenantBillsPage() {
  const params = useParams()
  const tenantId = params.id as string

  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [bills, setBills] = useState<Bill[]>([])

  useEffect(() => {
    const fetchData = async () => {
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
          property: transformJoin(t.property),
          room: transformJoin(t.room)
        })
      }

      // Fetch bills for this tenant
      const { data: billsData } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("bill_date", { ascending: false })

      if (billsData) {
        setBills(billsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [tenantId])

  const columns: Column<Bill>[] = [
    {
      key: "bill_number",
      header: "Bill #",
      render: (bill) => (
        <Link href={`/bills/${bill.id}`} className="font-medium text-primary hover:underline">
          {bill.bill_number}
        </Link>
      )
    },
    dateColumn("bill_date", "Bill Date"),
    {
      key: "billing_period",
      header: "Period",
      render: (bill) => `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
    },
    {
      key: "total_amount",
      header: "Amount",
      render: (bill) => <Currency amount={bill.total_amount} />
    },
    {
      key: "paid_amount",
      header: "Paid",
      render: (bill) => <Currency amount={bill.paid_amount} className="text-success" />
    },
    {
      key: "status",
      header: "Status",
      render: (bill) => <StatusBadge status={bill.status} />
    }
  ]

  if (loading) return <PageSkeleton variant="list" />

  if (!tenant) {
    return (
      <EmptyState
        icon={User}
        title="Tenant not found"
        description="The tenant you're looking for doesn't exist."
        action={{ label: "Back to Tenants", href: "/tenants" }}
      />
    )
  }

  return (
    <PermissionGuard permission="bills.view">
      <div className="space-y-6">
        <PageHeader
          title={`Bills for ${tenant.name}`}
          description={`${tenant.property?.name || ''} ${tenant.room ? `• Room ${tenant.room.room_number}` : ''}`}
          icon={Receipt}
          breadcrumbs={[
            { label: "Tenants", href: "/tenants" },
            { label: tenant.name, href: `/tenants/${tenantId}` },
            { label: "Bills" }
          ]}
          actions={
            <div className="flex gap-2">
              <Link href={`/tenants/${tenantId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tenant
                </Button>
              </Link>
              <Link href={`/bills/new?tenant_id=${tenantId}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Bill
                </Button>
              </Link>
            </div>
          }
        />

        {bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills yet"
            description={`No bills have been generated for ${tenant.name}.`}
            action={{ label: "Create Bill", href: `/bills/new?tenant_id=${tenantId}` }}
          />
        ) : (
          <DataTable
            data={bills}
            columns={columns}
            keyField="id"
            searchable
            searchFields={["bill_number"]}
            searchPlaceholder="Search bills..."
          />
        )}
      </div>
    </PermissionGuard>
  )
}
