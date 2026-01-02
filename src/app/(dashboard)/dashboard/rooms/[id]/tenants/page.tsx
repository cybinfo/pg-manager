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
import { Users, Plus, ArrowLeft, Home } from "lucide-react"
import { formatDate } from "@/lib/format"

interface Tenant {
  id: string
  name: string
  phone: string
  email: string | null
  check_in_date: string
  monthly_rent: number
  status: string
}

interface Room {
  id: string
  room_number: string
  room_type: string
  total_beds: number
  occupied_beds: number
  property: { id: string; name: string } | null
}

export default function RoomTenantsPage() {
  const params = useParams()
  const roomId = params.id as string
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      const supabase = createClient()

      // Fetch room details
      const { data: roomData } = await supabase
        .from("rooms")
        .select(`
          id, room_number, room_type, total_beds, occupied_beds,
          property:properties(id, name)
        `)
        .eq("id", roomId)
        .single()

      if (roomData) {
        const r = roomData as {
          id: string; room_number: string; room_type: string;
          total_beds: number; occupied_beds: number;
          property: { id: string; name: string }[] | null
        }
        setRoom({
          ...r,
          property: Array.isArray(r.property) ? r.property[0] : r.property
        })
      }

      // Fetch tenants in this room
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("id, name, phone, email, check_in_date, monthly_rent, status")
        .eq("room_id", roomId)
        .eq("status", "active")
        .order("check_in_date", { ascending: false })

      if (tenantsData) {
        setTenants(tenantsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [user, roomId])

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      header: "Tenant",
      render: (tenant) => (
        <Link href={`/dashboard/tenants/${tenant.id}`} className="font-medium text-teal-600 hover:underline">
          {tenant.name}
        </Link>
      )
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
          <Link href={`/dashboard/tenants/${tenant.id}/bills`}>
            <Button variant="ghost" size="sm">Bills</Button>
          </Link>
          <Link href={`/dashboard/tenants/${tenant.id}/payments`}>
            <Button variant="ghost" size="sm">Payments</Button>
          </Link>
        </div>
      )
    }
  ]

  if (loading) return <PageLoading />

  if (!room) {
    return (
      <EmptyState
        icon={Home}
        title="Room not found"
        description="The room you're looking for doesn't exist."
        action={{ label: "Back to Rooms", href: "/dashboard/rooms" }}
      />
    )
  }

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6">
        <PageHeader
          title={`Tenants in Room ${room.room_number}`}
          description={`${room.property?.name || ''} • ${room.room_type} • ${room.occupied_beds}/${room.total_beds} beds occupied`}
          icon={Users}
          breadcrumbs={[
            { label: "Rooms", href: "/dashboard/rooms" },
            { label: `Room ${room.room_number}`, href: `/dashboard/rooms/${roomId}` },
            { label: "Tenants" }
          ]}
          actions={
            <div className="flex gap-2">
              <Link href={`/dashboard/rooms/${roomId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Room
                </Button>
              </Link>
              {room.occupied_beds < room.total_beds && (
                <Link href={`/dashboard/tenants/new?room_id=${roomId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {tenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No tenants"
            description={`Room ${room.room_number} has no active tenants.`}
            action={{ label: "Add Tenant", href: `/dashboard/tenants/new?room_id=${roomId}` }}
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
