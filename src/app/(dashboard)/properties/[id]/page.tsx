"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, PROPERTY_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import {
  Property,
  PropertyRoom,
  PropertyTenant,
  PropertyBill,
  PropertyPayment,
  PropertyExpense,
  PropertyComplaint,
  PropertyVisitor,
} from "@/types/properties.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Building2,
  MapPin,
  Phone,
  User,
  Home,
  Users,
  IndianRupee,
  Pencil,
  Plus,
  Bed,
  Globe,
  ExternalLink,
  FileText,
  CreditCard,
  Receipt,
  Calendar,
  MessageSquare,
  UserCheck,
  Clock,
  AlertCircle,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  partially_occupied: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-gray-100 text-gray-700",
}

export default function PropertyDetailPage() {
  const params = useParams()

  const {
    data: property,
    related,
    loading,
  } = useDetailPage<Property>({
    config: PROPERTY_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) {
    return <PageLoading message="Loading property details..." />
  }

  if (!property) {
    return null
  }

  const rooms = (related.rooms || []) as PropertyRoom[]
  const tenants = (related.tenants || []) as PropertyTenant[]
  const bills = (related.bills || []) as PropertyBill[]
  const payments = (related.payments || []) as PropertyPayment[]
  const expenses = (related.expenses || []) as PropertyExpense[]
  const complaints = (related.complaints || []) as PropertyComplaint[]
  const visitors = (related.visitors || []) as PropertyVisitor[]

  // Calculate stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.total_beds, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const monthlyRevenue = tenants.reduce((sum, t) => sum + t.monthly_rent, 0)
  const activeTenants = tenants.filter(t => t.status === "active").length
  const noticeTenants = tenants.filter(t => t.status === "notice_period").length

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={property.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.city}{property.state && `, ${property.state}`}
            </span>
            {property.address && (
              <span className="flex items-center gap-1">
                {property.address}
              </span>
            )}
          </div>
        }
        backHref="/properties"
        backLabel="All Properties"
        status={property.is_active ? "active" : "inactive"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {property.website_enabled && property.website_slug && (
              <Link href={`/pg/${property.website_slug}`} target="_blank">
                <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                  <Globe className="mr-2 h-4 w-4" />
                  View Website
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
            <Link href={`/properties/${property.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/rooms/new?property=${property.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Total Rooms"
          value={rooms.length}
          icon={Home}
          variant="default"
        />
        <InfoCard
          label="Active Tenants"
          value={activeTenants}
          icon={Users}
          variant="success"
        />
        <InfoCard
          label={`Occupancy (${occupiedBeds}/${totalBeds})`}
          value={`${occupancyRate}%`}
          icon={Bed}
          variant="default"
        />
        <InfoCard
          label="Monthly Revenue"
          value={<Currency amount={monthlyRevenue} />}
          icon={IndianRupee}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="property-detail" entityType="property" record={property}>
        {/* Property Details */}
        <DetailSection
          title="Property Details"
          description="Location and manager information"
          icon={Building2}
        >
          {property.address && (
            <InfoRow label="Address" value={property.address} icon={MapPin} />
          )}
          <InfoRow label="City" value={property.city} />
          {property.state && (
            <InfoRow label="State" value={property.state} />
          )}
          {property.pincode && (
            <InfoRow label="Pincode" value={property.pincode} />
          )}
          {property.manager_name && (
            <InfoRow label="Manager" value={property.manager_name} icon={User} />
          )}
          {property.manager_phone && (
            <InfoRow
              label="Manager Phone"
              value={
                <a href={`tel:${property.manager_phone}`} className="text-teal-600 hover:underline">
                  {property.manager_phone}
                </a>
              }
              icon={Phone}
            />
          )}
        </DetailSection>

        {/* Tenants on Notice */}
        {noticeTenants > 0 && (
          <DetailListSection
            title="Tenants on Notice"
            description={`${noticeTenants} tenant(s) leaving soon`}
            icon={AlertCircle}
            className="border-yellow-200 bg-yellow-50/50"
            items={tenants.filter(t => t.status === "notice_period")}
            keyExtractor={(tenant, _idx) => tenant.id}
            renderItem={(tenant) => (
              <Link href={`/tenants/${tenant.id}`}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">Room {tenant.room?.room_number}</p>
                  </div>
                  <StatusBadge status="warning" label="Notice Period" size="sm" />
                </div>
              </Link>
            )}
            initialLimit={5}
            viewAllMode="expand"
            emptyText="No tenants on notice"
          />
        )}

        {/* Rooms List */}
        <DetailListSection
          title="Rooms"
          description={`${rooms.length} rooms in this property`}
          icon={Home}
          items={rooms}
          keyExtractor={(room, _idx) => room.id}
          renderItem={(room) => (
            <Link href={`/rooms/${room.id}`}>
              <div className="p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Room {room.room_number}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[room.status] || statusColors.available}`}>
                    {room.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {room.occupied_beds}/{room.total_beds}
                  </span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {formatCurrency(room.rent_amount)}
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  {room.has_ac && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">AC</span>
                  )}
                  {room.has_attached_bathroom && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Bath</span>
                  )}
                </div>
              </div>
            </Link>
          )}
          initialLimit={4}
          viewAllHref={`/properties/${property.id}/rooms`}
          viewAllMode="auto"
          emptyIcon={Home}
          emptyText="No rooms added yet"
          actions={
            <Link href={`/rooms/new?property=${property.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Room
              </Button>
            </Link>
          }
        />

        {/* Active Tenants */}
        <DetailListSection
          title="Active Tenants"
          description={`${activeTenants} tenants currently staying`}
          icon={Users}
          items={tenants.filter(t => t.status === "active")}
          keyExtractor={(tenant, _idx) => tenant.id}
          renderItem={(tenant) => (
            <Link href={`/tenants/${tenant.id}`}>
              <div className="p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="flex items-center gap-3">
                  <Avatar name={tenant.name} src={tenant.person?.photo_url || tenant.profile_photo || tenant.photo_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Room {tenant.room?.room_number} • {formatCurrency(tenant.monthly_rent)}/mo
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/properties/${property.id}/tenants`}
          viewAllMode="auto"
          emptyIcon={Users}
          emptyText="No active tenants"
          actions={
            <Link href={`/tenants/new?property=${property.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Tenant
              </Button>
            </Link>
          }
        />

        {/* Recent Bills */}
        <DetailListSection
          title="Recent Bills"
          description="Latest billing activity"
          icon={FileText}
          items={bills}
          keyExtractor={(bill, _idx) => bill.id}
          renderItem={(bill) => (
            <Link href={`/bills/${bill.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{bill.bill_number}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {bill.tenant?.name} • {formatDate(bill.bill_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(bill.total_amount)}</p>
                  {bill.balance_due > 0 && (
                    <p className="text-xs text-red-600">Due: {formatCurrency(bill.balance_due)}</p>
                  )}
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/bills?property=${property.id}`}
          viewAllMode="auto"
          emptyIcon={FileText}
          emptyText="No bills yet"
        />

        {/* Recent Payments */}
        <DetailListSection
          title="Recent Payments"
          description="Latest payment activity"
          icon={CreditCard}
          items={payments}
          keyExtractor={(payment, _idx) => payment.id}
          renderItem={(payment) => (
            <Link href={`/payments/${payment.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{payment.tenant?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(payment.payment_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-green-600">+{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{payment.payment_method.replace("_", " ")}</p>
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/payments?property=${property.id}`}
          viewAllMode="auto"
          emptyIcon={CreditCard}
          emptyText="No payments yet"
        />

        {/* Recent Expenses */}
        <DetailListSection
          title="Recent Expenses"
          description="Property-specific expenses"
          icon={Receipt}
          items={expenses}
          keyExtractor={(expense, _idx) => expense.id}
          renderItem={(expense) => (
            <Link href={`/expenses/${expense.id}`}>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{expense.expense_type?.name || "Expense"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {expense.description || formatDate(expense.expense_date)}
                  </p>
                </div>
                <p className="font-semibold text-sm text-rose-600">-{formatCurrency(expense.amount)}</p>
              </div>
            </Link>
          )}
          initialLimit={4}
          viewAllHref={`/expenses?property=${property.id}`}
          viewAllMode="auto"
          emptyIcon={Receipt}
          emptyText="No expenses recorded for this property"
          actions={
            <Link href={`/expenses/new?property=${property.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Expense
              </Button>
            </Link>
          }
        />

        {/* Recent Complaints */}
        <DetailListSection
          title="Recent Complaints"
          description="Issues reported by tenants"
          icon={MessageSquare}
          items={complaints}
          keyExtractor={(complaint, _idx) => complaint.id}
          renderItem={(complaint) => (
            <Link href={`/complaints/${complaint.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{complaint.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {complaint.tenant?.name}
                    {complaint.room && ` • Room ${complaint.room.room_number}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={
                      complaint.status === "open" ? "error" :
                      complaint.status === "in_progress" ? "warning" : "success"
                    }
                    label={complaint.status.replace("_", " ")}
                    size="sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(complaint.created_at)}
                  </p>
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/complaints?property=${property.id}`}
          viewAllMode="auto"
          emptyIcon={MessageSquare}
          emptyText="No complaints for this property"
        />

        {/* Recent Visitors */}
        <DetailListSection
          title="Recent Visitors"
          description="Visitor log for this property"
          icon={UserCheck}
          items={visitors}
          keyExtractor={(visitor, _idx) => visitor.id}
          renderItem={(visitor) => (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{visitor.visitor_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Visiting {visitor.tenant?.name}
                  {visitor.purpose && ` • ${visitor.purpose}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {formatDate(visitor.check_in_time)}
                </p>
                {visitor.is_overnight && (
                  <StatusBadge status="info" label="Overnight" size="sm" />
                )}
              </div>
            </div>
          )}
          initialLimit={5}
          viewAllHref={`/visitors?property=${property.id}`}
          viewAllMode="auto"
          emptyIcon={UserCheck}
          emptyText="No visitors recorded for this property"
        />

      </DetailPageTemplate>
    </div>
  )
}
