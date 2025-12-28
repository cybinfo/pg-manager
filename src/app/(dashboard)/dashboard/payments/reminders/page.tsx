"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Bell,
  Search,
  Loader2,
  User,
  Building2,
  Home,
  Phone,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  MessageCircle
} from "lucide-react"
import { toast } from "sonner"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { messageTemplates, generateWhatsAppLink, formatCurrency } from "@/lib/notifications"

interface TenantWithDues {
  id: string
  name: string
  phone: string
  email: string | null
  monthly_rent: number
  check_in_date: string
  property: {
    id: string
    name: string
  }
  room: {
    id: string
    room_number: string
  }
  // Calculated fields
  totalPaid: number
  expectedRent: number
  pendingDues: number
  monthsActive: number
  lastPaymentDate: string | null
}

export default function PaymentRemindersPage() {
  const [tenants, setTenants] = useState<TenantWithDues[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTenantsWithDues()
  }, [])

  const fetchTenantsWithDues = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
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
      console.error("Error fetching tenants:", tenantsError)
      toast.error("Failed to load tenants")
      setLoading(false)
      return
    }

    // Get all payments for these tenants
    const tenantIds = tenantsData?.map(t => t.id) || []
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("tenant_id, amount, payment_date")
      .in("tenant_id", tenantIds)

    // Calculate dues for each tenant
    const now = new Date()
    const tenantsWithDues: TenantWithDues[] = (tenantsData || []).map(tenant => {
      // Transform arrays to single objects (Supabase join pattern)
      const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property
      const room = Array.isArray(tenant.room) ? tenant.room[0] : tenant.room

      // Calculate months active
      const checkIn = new Date(tenant.check_in_date)
      const monthsActive = Math.max(1, Math.ceil(
        (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ))

      // Calculate expected rent (months * monthly_rent)
      const expectedRent = monthsActive * Number(tenant.monthly_rent)

      // Calculate total paid
      const tenantPayments = paymentsData?.filter(p => p.tenant_id === tenant.id) || []
      const totalPaid = tenantPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      // Calculate pending dues
      const pendingDues = Math.max(0, expectedRent - totalPaid)

      // Get last payment date
      const sortedPayments = tenantPayments.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
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

  const filteredTenants = tenants.filter(tenant => {
    return (
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.property?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const totalPendingDues = filteredTenants.reduce((sum, t) => sum + t.pendingDues, 0)

  const handleMarkSent = (tenantId: string) => {
    setSentReminders(prev => new Set([...prev, tenantId]))
    toast.success("Marked as sent")
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Calculate due date (1st of next month)
  const getDueDate = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 1)
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Payment Reminders</h1>
          <p className="text-muted-foreground">
            Send payment reminders to tenants with pending dues
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenants with Dues
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalPendingDues)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reminders Sent
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sentReminders.size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {tenants.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
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
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground text-center">
              No tenants have pending dues at the moment.
            </p>
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
        <div className="space-y-4">
          {filteredTenants.map((tenant) => {
            const isSent = sentReminders.has(tenant.id)
            const reminderMessage = messageTemplates.paymentReminder({
              tenantName: tenant.name,
              amount: tenant.pendingDues,
              propertyName: tenant.property?.name || "Property",
              dueDate: getDueDate(),
              ownerName,
            })

            return (
              <Card
                key={tenant.id}
                className={`transition-all ${isSent ? 'opacity-60 bg-muted/30' : 'hover:shadow-md'}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Tenant Info */}
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        tenant.pendingDues >= tenant.monthly_rent * 2
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {tenant.pendingDues >= tenant.monthly_rent * 2 ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : (
                          <Bell className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{tenant.name}</h3>
                          {isSent && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Sent
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {tenant.property?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            Room {tenant.room?.room_number}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Last payment: {formatDate(tenant.lastPaymentDate)}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          tenant.pendingDues >= tenant.monthly_rent * 2
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}>
                          {formatCurrency(tenant.pendingDues)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rent: {formatCurrency(tenant.monthly_rent)}/month
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isSent ? (
                          <>
                            <WhatsAppButton
                              phone={tenant.phone}
                              message={reminderMessage}
                              label="Send"
                              size="sm"
                              showCopyButton={false}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkSent(tenant.id)}
                              title="Mark as sent"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = generateWhatsAppLink(tenant.phone, reminderMessage)
                              window.open(url, "_blank", "noopener,noreferrer")
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tips Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Tips for sending reminders</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Send reminders 3-5 days before the due date</li>
                <li>• Click the WhatsApp button to send a pre-formatted message</li>
                <li>• Mark as sent to track which tenants you&apos;ve reminded</li>
                <li>• Tenants with 2+ months pending are highlighted in red</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
