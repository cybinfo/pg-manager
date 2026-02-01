/**
 * Library Detail Page
 *
 * Shows library information with sections, seats, members, and lockers.
 */

"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
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
  Library,
  MapPin,
  Phone,
  Mail,
  Clock,
  Armchair,
  Users,
  Lock,
  Grid3X3,
  Plus,
  Pencil,
  Wifi,
  Car,
  CreditCard,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import type {
  Library as LibraryType,
  LibrarySection,
  LibraryMember,
  LibraryLocker,
  LibraryPayment,
} from "@/types/library.types"

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-gray-100 text-gray-700",
}

export default function LibraryDetailPage() {
  const params = useParams()

  const {
    data: library,
    related,
    loading,
  } = useDetailPage<LibraryType>({
    config: LIBRARY_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) {
    return <PageLoading message="Loading library details..." />
  }

  if (!library) {
    return null
  }

  const sections = (related.sections || []) as LibrarySection[]
  const members = (related.members || []) as LibraryMember[]
  const lockers = (related.lockers || []) as LibraryLocker[]
  const recentPayments = (related.recentPayments || []) as LibraryPayment[]

  // Calculate stats
  const availableSeats = library.total_seats - library.occupied_seats
  const occupancyRate = library.total_seats > 0
    ? Math.round((library.occupied_seats / library.total_seats) * 100)
    : 0
  const availableLockers = lockers.filter(l => l.status === "available").length

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={library.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {library.code && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{library.code}</span>
            )}
            {library.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {library.city}{library.state && `, ${library.state}`}
              </span>
            )}
          </div>
        }
        backHref="/library"
        backLabel="All Libraries"
        status={library.is_active ? "active" : "inactive"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Library className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/library/${library.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/library-sections/new?library=${library.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Total Sections"
          value={library.total_sections}
          icon={Grid3X3}
          variant="default"
        />
        <InfoCard
          label="Available Seats"
          value={`${availableSeats}/${library.total_seats}`}
          icon={Armchair}
          variant={availableSeats > 0 ? "success" : "warning"}
        />
        <InfoCard
          label="Active Members"
          value={members.length}
          icon={Users}
          variant="default"
        />
        <InfoCard
          label={`Occupancy`}
          value={`${occupancyRate}%`}
          icon={Armchair}
          variant={occupancyRate >= 80 ? "warning" : "default"}
        />
      </div>

      <DetailPageTemplate layoutKey="library-detail" entityType="library" record={library}>
        {/* Library Details */}
        <DetailSection
          title="Library Details"
          description="Location and contact information"
          icon={Library}
        >
          {library.address && (
            <InfoRow label="Address" value={library.address} icon={MapPin} />
          )}
          <InfoRow label="City" value={library.city || "—"} />
          {library.state && (
            <InfoRow label="State" value={library.state} />
          )}
          {library.pincode && (
            <InfoRow label="Pincode" value={library.pincode} />
          )}
          {library.phone && (
            <InfoRow
              label="Phone"
              value={
                <a href={`tel:${library.phone}`} className="text-primary hover:underline">
                  {library.phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {library.email && (
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${library.email}`} className="text-primary hover:underline">
                  {library.email}
                </a>
              }
              icon={Mail}
            />
          )}
        </DetailSection>

        {/* Operating Hours & Features */}
        <DetailSection
          title="Operating Hours & Amenities"
          description="Timings and facilities"
          icon={Clock}
        >
          {library.opening_time && library.closing_time && (
            <InfoRow
              label="Hours"
              value={`${library.opening_time?.slice(0, 5)} - ${library.closing_time?.slice(0, 5)}`}
              icon={Clock}
            />
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            {library.has_ac && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">AC</span>
            )}
            {library.has_wifi && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                WiFi
              </span>
            )}
            {library.has_lockers && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Lockers
              </span>
            )}
            {library.has_parking && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium flex items-center gap-1">
                <Car className="h-3 w-3" />
                Parking
              </span>
            )}
          </div>
        </DetailSection>

        {/* Sections List */}
        <DetailListSection
          title="Sections"
          description={`${sections.length} sections in this library`}
          icon={Grid3X3}
          items={sections}
          keyExtractor={(section) => section.id}
          renderItem={(section) => (
            <Link href={`/library-sections/${section.id}`}>
              <div className="p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{section.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${section.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {section.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Armchair className="h-3 w-3" />
                    {section.occupied_seats}/{section.total_seats} seats
                  </span>
                  {section.is_ac && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">AC</span>
                  )}
                  {section.floor > 0 && (
                    <span className="text-xs">Floor {section.floor}</span>
                  )}
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/library-sections?library=${library.id}`}
          viewAllMode="auto"
          emptyIcon={Grid3X3}
          emptyText="No sections added yet"
          actions={
            <Link href={`/library-sections/new?library=${library.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Section
              </Button>
            </Link>
          }
        />

        {/* Active Members */}
        <DetailListSection
          title="Active Members"
          description={`${members.length} members currently active`}
          icon={Users}
          items={members}
          keyExtractor={(member) => member.id}
          renderItem={(member) => (
            <Link href={`/library-members/${member.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.member_code} • {member.hours_balance?.toFixed(1) || 0}h remaining
                  </p>
                </div>
                <StatusBadge
                  status={member.status === "active" ? "success" : "warning"}
                  label={member.status}
                  size="sm"
                />
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/library-members?library=${library.id}`}
          viewAllMode="auto"
          emptyIcon={Users}
          emptyText="No active members"
          actions={
            <Link href={`/library-members/new?library=${library.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Member
              </Button>
            </Link>
          }
        />

        {/* Lockers */}
        <DetailListSection
          title="Lockers"
          description={`${availableLockers}/${lockers.length} available`}
          icon={Lock}
          items={lockers}
          keyExtractor={(locker) => locker.id}
          renderItem={(locker) => (
            <Link href={`/library-lockers/${locker.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Locker #{locker.locker_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {locker.size} • {locker.monthly_rent ? <Currency amount={locker.monthly_rent} /> : "—"}/mo
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[locker.status]}`}>
                  {locker.status}
                </span>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/library-lockers?library=${library.id}`}
          viewAllMode="auto"
          emptyIcon={Lock}
          emptyText="No lockers configured"
          actions={
            <Link href={`/library-lockers/new?library=${library.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Locker
              </Button>
            </Link>
          }
        />

        {/* Recent Payments */}
        <DetailListSection
          title="Recent Payments"
          description="Latest payment activity"
          icon={CreditCard}
          items={recentPayments}
          keyExtractor={(payment) => payment.id}
          renderItem={(payment) => (
            <Link href={`/library-payments/${payment.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {(payment.member as { name?: string })?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.payment_type} • {formatDate(payment.payment_date)}
                  </p>
                </div>
                <p className="font-semibold text-sm text-green-600">
                  +<Currency amount={payment.amount} />
                </p>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/library-payments`}
          viewAllMode="auto"
          emptyIcon={CreditCard}
          emptyText="No payments yet"
        />
      </DetailPageTemplate>
    </div>
  )
}
