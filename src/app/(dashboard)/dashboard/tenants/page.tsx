"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Users,
  Plus,
  Building2,
  Home,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Phone,
  Calendar,
  IndianRupee
} from "lucide-react"
import { toast } from "sonner"

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  property: {
    id: string
    name: string
  } | null
  room: {
    id: string
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  monthly_rent: number
  status: string
  property: {
    id: string
    name: string
  }[] | null
  room: {
    id: string
    room_number: string
  }[] | null
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  notice_period: "bg-yellow-100 text-yellow-700",
  checked_out: "bg-gray-100 text-gray-700",
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        property:properties(id, name),
        room:rooms(id, room_number)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tenants:", error)
      toast.error("Failed to load tenants")
      setLoading(false)
      return
    }

    // Transform the data from arrays to single objects
    const transformedData = ((data as RawTenant[]) || []).map((tenant) => ({
      ...tenant,
      property: tenant.property && tenant.property.length > 0 ? tenant.property[0] : null,
      room: tenant.room && tenant.room.length > 0 ? tenant.room[0] : null,
    }))
    setTenants(transformedData)
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete tenant "${name}"? This action cannot be undone.`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("tenants").delete().eq("id", id)

    if (error) {
      console.error("Error deleting tenant:", error)
      toast.error("Failed to delete tenant")
      return
    }

    toast.success("Tenant deleted successfully")
    fetchTenants()
  }

  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.phone.includes(searchQuery) ||
    tenant.property?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.room?.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Manage all your tenants across properties
          </p>
        </div>
        <Link href="/dashboard/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {/* Search */}
      {tenants.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Tenants List */}
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tenants yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first tenant to start managing your PG
            </p>
            <Link href="/dashboard/tenants/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tenants found</h3>
            <p className="text-muted-foreground text-center">
              Try a different search term
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {tenant.phone}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/tenants/${tenant.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(tenant.id, tenant.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status] || statusColors.active}`}>
                      {tenant.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{tenant.property?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>Room {tenant.room?.room_number}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Since {formatDate(tenant.check_in_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>₹{tenant.monthly_rent.toLocaleString("en-IN")}/month</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Link href={`/dashboard/tenants/${tenant.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
