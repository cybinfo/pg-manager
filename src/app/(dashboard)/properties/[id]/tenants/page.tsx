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
import { PageLoader } from "@/components/ui/page-loader"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Users, Plus, ArrowLeft, Building2 } from "lucide-react"
import { formatDate } from "@/lib/format"

interface Tenant {
  id: string
  name: string
  phone: string
  email: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  room: { room_number: string } | null
}

interface Property {
  id: string
  name: string
  address: string
  type: string
}

export default function PropertyTenantsPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState<Property | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch property details
      const { data: propertyData } = await supabase
        .from("properties")
        .select("id, name, address, type")
        .eq("id", propertyId)
        .single()

      if (propertyData) {
        setProperty(propertyData)
      }

      // Fetch tenants in this property
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select(`
          id, name, phone, email, check_in_date, monthly_rent, status,
          room:rooms(room_number)
        `)
        .eq("property_id", propertyId)
        .order("name", { ascending: true })

      if (tenantsData) {
        const processed = tenantsData.map((t: {
          id: string; name: string; phone: string; email: string | null;
          check_in_date: string; monthly_rent: number; status: string;
          room: { room_number: string }[] | null
        }) => ({
          ...t,
          room: Array.isArray(t.room) ? t.room[0] : t.room
        }))
        setTenants(processed)
      }

      setLoading(false)
    }

    fetchData()
  }, [propertyId])

  const activeTenants = tenants.filter(t => t.status === 'active').length
  const totalRent = tenants.filter(t => t.status === 'active').reduce((sum, t) => sum + t.monthly_rent, 0)

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      header: "Tenant",
      render: (tenant) => (
        <Link href={`/tenants/${tenant.id}`} className="font-medium text-teal-600 hover:underline">
          {tenant.name}
        </Link>
      )
    },
    {
      key: "room",
      header: "Room",
      render: (tenant) => tenant.room ? (
        <span className="text-muted-foreground">Room {tenant.room.room_number}</span>
      ) : "-"
    },
    {
      key: "phone",
      header: "Phone",
      render: (tenant) => tenant.phone
    },
    {
      key: "check_in_date",
      header: "Check-in",
      render: (tenant) => formatDate(tenant.check_in_date)
    },
    {
      key: "monthly_rent",
      header: "Rent",
      render: (tenant) => <Currency amount={tenant.monthly_rent} />
    },
    {
      key: "status",
      header: "Status",
      render: (tenant) => <StatusBadge status={tenant.status} />
    },
    {
      key: "actions",
      header: "",
      render: (tenant) => (
        <div className="flex gap-1">
          <Link href={`/tenants/${tenant.id}/bills`}>
            <Button variant="ghost" size="sm">Bills</Button>
          </Link>
          <Link href={`/tenants/${tenant.id}/payments`}>
            <Button variant="ghost" size="sm">Payments</Button>
          </Link>
        </div>
      )
    }
  ]

  if (loading) return <PageLoader />

  if (!property) {
    return (
      <EmptyState
        icon={Building2}
        title="Property not found"
        description="The property you're looking for doesn't exist."
        action={{ label: "Back to Properties", href: "/properties" }}
      />
    )
  }

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6">
        <PageHeader
          title={`Tenants in ${property.name}`}
          description={`${activeTenants} active tenants • Total rent: ₹${totalRent.toLocaleString('en-IN')}/month`}
          icon={Users}
          breadcrumbs={[
            { label: "Properties", href: "/properties" },
            { label: property.name, href: `/properties/${propertyId}` },
            { label: "Tenants" }
          ]}
          actions={
            <div className="flex gap-2">
              <Link href={`/properties/${propertyId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property
                </Button>
              </Link>
              <Link href={`/tenants/new?property_id=${propertyId}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tenant
                </Button>
              </Link>
            </div>
          }
        />

        {tenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No tenants yet"
            description={`${property.name} has no tenants.`}
            action={{ label: "Add Tenant", href: `/tenants/new?property_id=${propertyId}` }}
          />
        ) : (
          <DataTable
            data={tenants}
            columns={columns}
            keyField="id"
            searchable
            searchFields={["name", "phone"]}
            searchPlaceholder="Search tenants..."
          />
        )}
      </div>
    </PermissionGuard>
  )
}
