/**
 * Person Detail Page - 360° View
 *
 * Shows complete view of a person including:
 * - Personal details and documents
 * - All roles (tenant, staff, visitor)
 * - Tenant history across properties
 * - Visit history
 * - Related people (emergency contacts)
 */

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
import { DetailHero, InfoCard, DetailSection, InfoRow } from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  CreditCard,
  BadgeCheck,
  Ban,
  Home,
  Briefcase,
  UserCircle,
  History,
  Edit,
  Shield,
  Heart,
  FileText,
  AlertTriangle,
  Clock,
  Wrench,
  Star,
  Merge,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatCurrency } from "@/lib/format"
import { PermissionGuard, PermissionGate } from "@/components/auth"
import {
  Person,
  PersonTenantHistory,
  PersonVisitHistory,
  GENDER_LABELS,
} from "@/types/people.types"

// Staff history type
interface PersonStaffHistory {
  id: string
  is_active: boolean
  created_at: string
  user_id: string | null
}

// Timeline event type
interface TimelineEvent {
  id: string
  type: "tenant_join" | "tenant_leave" | "staff_join" | "staff_leave" | "visit" | "verified" | "blocked"
  date: string
  title: string
  subtitle?: string
  metadata?: Record<string, unknown>
}

// ============================================
// Tag Badge Component
// ============================================

const TAG_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  visitor: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  frequent: "bg-yellow-100 text-yellow-700",
  vip: "bg-amber-100 text-amber-700",
  blocked: "bg-red-100 text-red-700",
  verified: "bg-emerald-100 text-emerald-700",
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  tenant: <Home className="h-3 w-3" />,
  staff: <Briefcase className="h-3 w-3" />,
  visitor: <UserCircle className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  frequent: <Star className="h-3 w-3" />,
}

const TagBadge = ({ tag }: { tag: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || "bg-slate-100 text-slate-700"}`}>
    {TAG_ICONS[tag]}
    {tag.replace("_", " ")}
  </span>
)

// ============================================
// Page Component
// ============================================

export default function PersonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState<Person | null>(null)
  const [tenantHistory, setTenantHistory] = useState<PersonTenantHistory[]>([])
  const [staffHistory, setStaffHistory] = useState<PersonStaffHistory[]>([])
  const [visitHistory, setVisitHistory] = useState<PersonVisitHistory[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [summary, setSummary] = useState({
    total_stays: 0,
    total_visits: 0,
    is_current_tenant: false,
    is_staff: false,
  })

  useEffect(() => {
    const fetchPerson = async () => {
      const supabase = createClient()

      // Fetch person details
      const { data: personData, error: personError } = await supabase
        .from("people")
        .select("*")
        .eq("id", params.id)
        .single()

      if (personError || !personData) {
        console.error("Error fetching person:", personError)
        toast.error("Person not found")
        router.push("/people")
        return
      }

      setPerson(personData)

      // Fetch tenant history
      const { data: tenants } = await supabase
        .from("tenants")
        .select(`
          id,
          check_in_date,
          check_out_date,
          status,
          monthly_rent,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("person_id", params.id)
        .order("check_in_date", { ascending: false })

      if (tenants) {
        const transformedTenants = tenants.map((t: {
          id: string
          check_in_date: string
          check_out_date: string | null
          status: string
          monthly_rent: number
          property: { name: string }[] | null
          room: { room_number: string }[] | null
        }) => ({
          id: t.id,
          property_name: Array.isArray(t.property) ? t.property[0]?.name : (t.property as { name: string } | null)?.name || "Unknown",
          room_number: Array.isArray(t.room) ? t.room[0]?.room_number : (t.room as { room_number: string } | null)?.room_number || "Unknown",
          check_in_date: t.check_in_date,
          check_out_date: t.check_out_date,
          status: t.status,
          monthly_rent: t.monthly_rent,
        }))
        setTenantHistory(transformedTenants)
      }

      // Fetch visit history via visitor_contacts
      const { data: visitorContact } = await supabase
        .from("visitor_contacts")
        .select("id")
        .eq("person_id", params.id)
        .single()

      if (visitorContact) {
        const { data: visits } = await supabase
          .from("visitors")
          .select(`
            id,
            check_in_time,
            check_out_time,
            visitor_type,
            purpose,
            property:properties(name)
          `)
          .eq("visitor_contact_id", visitorContact.id)
          .order("check_in_time", { ascending: false })
          .limit(10)

        if (visits) {
          const transformedVisits = visits.map((v: {
            id: string
            check_in_time: string
            check_out_time: string | null
            visitor_type: string
            purpose: string | null
            property: { name: string }[] | null
          }) => ({
            id: v.id,
            check_in_time: v.check_in_time,
            check_out_time: v.check_out_time,
            visitor_type: v.visitor_type,
            purpose: v.purpose,
            property_name: Array.isArray(v.property) ? v.property[0]?.name : (v.property as { name: string } | null)?.name || "Unknown",
          }))
          setVisitHistory(transformedVisits)
        }
      }

      // Fetch staff history
      const { data: staffRecords } = await supabase
        .from("staff_members")
        .select("id, is_active, created_at, user_id")
        .eq("person_id", params.id)
        .order("created_at", { ascending: false })

      if (staffRecords) {
        setStaffHistory(staffRecords)
      }

      // Calculate summary
      const currentTenant = tenants?.some((t: { status: string }) => t.status === "active")
      const activeStaff = staffRecords?.some((s: { is_active: boolean }) => s.is_active)

      const { data: visitCount } = await supabase
        .from("visitor_contacts")
        .select("visit_count")
        .eq("person_id", params.id)
        .single()

      setSummary({
        total_stays: tenants?.length || 0,
        total_visits: visitCount?.visit_count || 0,
        is_current_tenant: currentTenant || false,
        is_staff: activeStaff || false,
      })

      // Build unified timeline
      const timelineEvents: TimelineEvent[] = []

      // Add tenant events
      if (tenants) {
        tenants.forEach((t: {
          id: string
          check_in_date: string
          check_out_date: string | null
          status: string
          property: { name: string }[] | null
          room: { room_number: string }[] | null
        }) => {
          const propertyName = Array.isArray(t.property) ? t.property[0]?.name : (t.property as { name: string } | null)?.name || "Unknown"
          const roomNumber = Array.isArray(t.room) ? t.room[0]?.room_number : (t.room as { room_number: string } | null)?.room_number || "Unknown"

          timelineEvents.push({
            id: `tenant_join_${t.id}`,
            type: "tenant_join",
            date: t.check_in_date,
            title: "Joined as Tenant",
            subtitle: `${propertyName} - Room ${roomNumber}`,
          })

          if (t.check_out_date) {
            timelineEvents.push({
              id: `tenant_leave_${t.id}`,
              type: "tenant_leave",
              date: t.check_out_date,
              title: "Checked Out",
              subtitle: `${propertyName} - Room ${roomNumber}`,
            })
          }
        })
      }

      // Add staff events
      if (staffRecords) {
        staffRecords.forEach((s: { id: string; created_at: string; is_active: boolean }) => {
          timelineEvents.push({
            id: `staff_join_${s.id}`,
            type: "staff_join",
            date: s.created_at,
            title: "Added as Staff",
            subtitle: s.is_active ? "Currently Active" : "No longer active",
          })
        })
      }

      // Add verification event
      if (personData.verified_at) {
        timelineEvents.push({
          id: "verified",
          type: "verified",
          date: personData.verified_at,
          title: "Identity Verified",
          subtitle: "Documents verified successfully",
        })
      }

      // Add blocked event
      if (personData.is_blocked && personData.blocked_at) {
        timelineEvents.push({
          id: "blocked",
          type: "blocked",
          date: personData.blocked_at,
          title: "Account Blocked",
          subtitle: personData.blocked_reason || "No reason provided",
        })
      }

      // Sort timeline by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTimeline(timelineEvents)

      setLoading(false)
    }

    fetchPerson()
  }, [params.id, router])

  // Handle verify person
  const handleVerify = async () => {
    if (!person) return

    const supabase = createClient()
    const { error } = await supabase.rpc("verify_person", { p_person_id: person.id })

    if (error) {
      console.error("Error verifying person:", error)
      toast.error("Failed to verify person")
      return
    }

    toast.success("Person verified successfully")
    setPerson({ ...person, is_verified: true, verified_at: new Date().toISOString() })
  }

  // Handle block person
  const handleBlock = async () => {
    if (!person) return

    const reason = window.prompt("Enter reason for blocking this person:")
    if (reason === null) return // User cancelled

    const supabase = createClient()
    const { error } = await supabase.rpc("block_person", {
      p_person_id: person.id,
      p_reason: reason || "No reason provided",
    })

    if (error) {
      console.error("Error blocking person:", error)
      toast.error("Failed to block person")
      return
    }

    toast.success("Person blocked successfully")
    setPerson({
      ...person,
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason: reason || "No reason provided",
    })
  }

  // Handle unblock person
  const handleUnblock = async () => {
    if (!person) return

    const supabase = createClient()
    const { error } = await supabase.rpc("unblock_person", { p_person_id: person.id })

    if (error) {
      console.error("Error unblocking person:", error)
      toast.error("Failed to unblock person")
      return
    }

    toast.success("Person unblocked successfully")
    setPerson({ ...person, is_blocked: false, blocked_at: null, blocked_reason: null })
  }

  // Handle delete person
  const handleDelete = async () => {
    if (!person) return

    // Check if person is linked to any active records
    if (summary.is_current_tenant) {
      toast.error("Cannot delete: This person is currently an active tenant")
      return
    }

    if (summary.is_staff) {
      toast.error("Cannot delete: This person is currently an active staff member")
      return
    }

    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to delete "${person.name}"?\n\n` +
      `This action cannot be undone. All associated records will be unlinked.`
    )

    if (!confirmed) return

    const supabase = createClient()

    // First, unlink from tenants (set person_id to null)
    if (tenantHistory.length > 0) {
      await supabase
        .from("tenants")
        .update({ person_id: null })
        .eq("person_id", person.id)
    }

    // Unlink from staff_members
    if (staffHistory.length > 0) {
      await supabase
        .from("staff_members")
        .update({ person_id: null })
        .eq("person_id", person.id)
    }

    // Unlink from visitor_contacts
    await supabase
      .from("visitor_contacts")
      .update({ person_id: null })
      .eq("person_id", person.id)

    // Delete person_roles
    await supabase
      .from("person_roles")
      .delete()
      .eq("person_id", person.id)

    // Finally, delete the person
    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", person.id)

    if (error) {
      console.error("Error deleting person:", error)
      toast.error("Failed to delete person")
      return
    }

    toast.success("Person deleted successfully")
    router.push("/people")
  }

  if (loading) {
    return <PageLoader />
  }

  if (!person) {
    return null
  }

  // Determine status for hero
  const getStatus = () => {
    if (person.is_blocked) return "blocked"
    if (summary.is_current_tenant) return "active"
    if (summary.is_staff) return "staff"
    return "inactive"
  }

  const getStatusLabel = () => {
    if (person.is_blocked) return "Blocked"
    if (summary.is_current_tenant) return "Active Tenant"
    if (summary.is_staff) return "Active Staff"
    return "Inactive"
  }

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6 animate-fade-in-up">
        {/* Hero Section */}
        <DetailHero
          title={person.name}
          subtitle={
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {person.tags?.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
              {person.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
          }
          backHref="/people"
          backLabel="People"
          status={getStatus()}
          statusLabel={getStatusLabel()}
          avatar={<Avatar name={person.name} src={person.photo_url} size="xl" clickable />}
          actions={
            <div className="flex items-center gap-2">
              <PermissionGate permission="tenants.update" hide>
                <Link href={`/people/merge?id=${person.id}`}>
                  <Button variant="outline" size="sm">
                    <Merge className="mr-2 h-4 w-4" />
                    Merge
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission="tenants.update" hide>
                <Link href={`/people/${person.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission="tenants.delete" hide>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </PermissionGate>
            </div>
          }
        />

        {/* Blocked Warning */}
        {person.is_blocked && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-300 bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-700">This person is blocked</p>
              <p className="text-sm text-red-600">
                {person.blocked_reason || "No reason provided"}
                {person.blocked_at && ` - Blocked on ${formatDate(person.blocked_at)}`}
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard
            label={summary.is_current_tenant ? "Active Tenant" : "Total Stays"}
            value={summary.total_stays}
            icon={Home}
            variant={summary.is_current_tenant ? "success" : "default"}
          />
          <InfoCard
            label="Total Visits"
            value={summary.total_visits}
            icon={UserCircle}
            variant="default"
          />
          <InfoCard
            label="Staff Status"
            value={summary.is_staff ? "Active Staff" : "Not Staff"}
            icon={Briefcase}
            variant={summary.is_staff ? "success" : "muted"}
          />
          <InfoCard
            label="Verification"
            value={person.is_verified ? "Verified" : "Not Verified"}
            icon={Shield}
            variant={person.is_verified ? "success" : "muted"}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <DetailSection
            title="Personal Information"
            description="Basic identity details"
            icon={User}
          >
            <div className="space-y-1">
              {person.phone && (
                <InfoRow
                  label="Phone"
                  icon={Phone}
                  value={
                    <a href={`tel:${person.phone}`} className="text-primary hover:underline">
                      {person.phone}
                    </a>
                  }
                />
              )}
              {person.email && (
                <InfoRow
                  label="Email"
                  icon={Mail}
                  value={
                    <a href={`mailto:${person.email}`} className="text-primary hover:underline truncate max-w-[200px] inline-block">
                      {person.email}
                    </a>
                  }
                />
              )}
              {person.date_of_birth && (
                <InfoRow
                  label="Date of Birth"
                  icon={Calendar}
                  value={formatDate(person.date_of_birth)}
                />
              )}
              {person.gender && (
                <InfoRow
                  label="Gender"
                  value={GENDER_LABELS[person.gender]}
                />
              )}
              {person.blood_group && (
                <InfoRow
                  label="Blood Group"
                  icon={Heart}
                  value={person.blood_group}
                />
              )}
              {person.occupation && (
                <InfoRow
                  label="Occupation"
                  icon={Briefcase}
                  value={person.occupation}
                />
              )}
              {person.company_name && (
                <InfoRow
                  label="Company"
                  icon={Building2}
                  value={person.company_name}
                />
              )}
            </div>
          </DetailSection>

          {/* ID Documents */}
          <DetailSection
            title="ID Documents"
            description="Identity verification documents"
            icon={CreditCard}
          >
            <div className="space-y-1">
              {person.aadhaar_number && (
                <InfoRow
                  label="Aadhaar"
                  value={<span className="font-mono">{person.aadhaar_number}</span>}
                />
              )}
              {person.pan_number && (
                <InfoRow
                  label="PAN"
                  value={<span className="font-mono">{person.pan_number}</span>}
                />
              )}
              {person.id_documents && person.id_documents.length > 0 ? (
                person.id_documents.map((doc, index) => (
                  <InfoRow
                    key={index}
                    label={doc.type.replace("_", " ").toUpperCase()}
                    value={
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{doc.number}</span>
                        {doc.verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                      </div>
                    }
                  />
                ))
              ) : !person.aadhaar_number && !person.pan_number ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No ID documents added
                </p>
              ) : null}
            </div>
          </DetailSection>

          {/* Address */}
          {(person.permanent_address || person.current_address) && (
            <DetailSection
              title="Address"
              description="Location information"
              icon={MapPin}
            >
              <div className="space-y-4">
                {person.permanent_address && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Permanent Address</p>
                    <p className="font-medium">{person.permanent_address}</p>
                    {(person.permanent_city || person.permanent_state) && (
                      <p className="text-sm text-muted-foreground">
                        {[person.permanent_city, person.permanent_state, person.permanent_pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {person.current_address && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Address</p>
                    <p className="font-medium">{person.current_address}</p>
                    {person.current_city && (
                      <p className="text-sm text-muted-foreground">{person.current_city}</p>
                    )}
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {/* Emergency Contacts */}
          {person.emergency_contacts && person.emergency_contacts.length > 0 && (
            <DetailSection
              title="Emergency Contacts"
              description="People to contact in emergencies"
              icon={Phone}
            >
              <div className="space-y-3">
                {person.emergency_contacts.map((contact, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.relation}</p>
                      </div>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
        </div>

        {/* Tenant History */}
        {tenantHistory.length > 0 && (
          <DetailSection
            title="Tenant History"
            description={`${tenantHistory.length} stay${tenantHistory.length > 1 ? "s" : ""} across properties`}
            icon={Home}
          >
            <div className="space-y-3">
              {tenantHistory.map((stay) => (
                <Link
                  key={stay.id}
                  href={`/tenants/${stay.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        stay.status === "active" ? "bg-blue-100" : "bg-slate-100"
                      }`}>
                        <Home className={`h-5 w-5 ${
                          stay.status === "active" ? "text-blue-600" : "text-slate-600"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stay.property_name}</span>
                          <span className="text-muted-foreground">Room {stay.room_number}</span>
                          {stay.status === "active" && (
                            <StatusBadge status="active" label="Current" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(stay.check_in_date)} - {stay.check_out_date ? formatDate(stay.check_out_date) : "Present"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(stay.monthly_rent)}/mo</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Staff History */}
        {staffHistory.length > 0 && (
          <DetailSection
            title="Staff History"
            description={`${staffHistory.length} staff record${staffHistory.length > 1 ? "s" : ""}`}
            icon={Briefcase}
          >
            <div className="space-y-3">
              {staffHistory.map((staff) => (
                <Link
                  key={staff.id}
                  href={`/staff/${staff.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        staff.is_active ? "bg-green-100" : "bg-slate-100"
                      }`}>
                        <Briefcase className={`h-5 w-5 ${
                          staff.is_active ? "text-green-600" : "text-slate-600"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Staff Member</span>
                          <StatusBadge
                            status={staff.is_active ? "active" : "inactive"}
                            label={staff.is_active ? "Active" : "Inactive"}
                          />
                          {staff.user_id && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              Can Login
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Added {formatDate(staff.created_at)}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Visit History */}
        {visitHistory.length > 0 && (
          <DetailSection
            title="Visit History"
            description="Recent visits to properties"
            icon={History}
          >
            <div className="space-y-3">
              {visitHistory.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/visitors/${visit.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{visit.property_name}</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium capitalize">
                            {visit.visitor_type.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {visit.purpose || "No purpose specified"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="font-medium">{formatDate(visit.check_in_time)}</p>
                        <p className="text-muted-foreground">
                          {visit.check_out_time ? "Checked out" : "Still here"}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Notes */}
        {person.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={FileText}
          >
            <p className="whitespace-pre-wrap text-sm">{person.notes}</p>
          </DetailSection>
        )}

        {/* Activity Timeline */}
        {timeline.length > 0 && (
          <DetailSection
            title="Activity Timeline"
            description="Complete history of this person's journey"
            icon={Clock}
            collapsible
            defaultOpen={false}
          >
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-4">
                {timeline.map((event) => {
                  const getEventIcon = () => {
                    switch (event.type) {
                      case "tenant_join":
                        return <Home className="h-4 w-4 text-blue-600" />
                      case "tenant_leave":
                        return <Home className="h-4 w-4 text-slate-500" />
                      case "staff_join":
                        return <Briefcase className="h-4 w-4 text-green-600" />
                      case "staff_leave":
                        return <Briefcase className="h-4 w-4 text-slate-500" />
                      case "visit":
                        return <UserCircle className="h-4 w-4 text-purple-600" />
                      case "verified":
                        return <BadgeCheck className="h-4 w-4 text-emerald-600" />
                      case "blocked":
                        return <Ban className="h-4 w-4 text-red-600" />
                      default:
                        return <Clock className="h-4 w-4 text-slate-500" />
                    }
                  }

                  const getEventBg = () => {
                    switch (event.type) {
                      case "tenant_join":
                        return "bg-blue-100"
                      case "tenant_leave":
                        return "bg-slate-100"
                      case "staff_join":
                        return "bg-green-100"
                      case "staff_leave":
                        return "bg-slate-100"
                      case "visit":
                        return "bg-purple-100"
                      case "verified":
                        return "bg-emerald-100"
                      case "blocked":
                        return "bg-red-100"
                      default:
                        return "bg-slate-100"
                    }
                  }

                  return (
                    <div key={event.id} className="relative flex items-start gap-4 pl-2">
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${getEventBg()}`}>
                        {getEventIcon()}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(event.date)}</p>
                        </div>
                        {event.subtitle && (
                          <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </DetailSection>
        )}

        {/* Quick Actions */}
        <DetailSection
          title="Quick Actions"
          icon={Star}
        >
          <div className="space-y-6">
            {/* Role Actions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add to Role</p>
              <div className="flex flex-wrap gap-3">
                {!person.tags?.includes("tenant") && !person.is_blocked && (
                  <Link href={`/tenants/new?person_id=${person.id}`}>
                    <Button variant="outline" size="sm">
                      <Home className="mr-2 h-4 w-4" />
                      Add as Tenant
                    </Button>
                  </Link>
                )}
                {!person.is_blocked && (
                  <Link href={`/visitors/new?person_id=${person.id}`}>
                    <Button variant="outline" size="sm">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Check In as Visitor
                    </Button>
                  </Link>
                )}
                {!person.tags?.includes("staff") && !person.is_blocked && (
                  <Link href={`/staff/new?person_id=${person.id}`}>
                    <Button variant="outline" size="sm">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Add as Staff
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Verification & Status Actions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Verification & Status</p>
              <div className="flex flex-wrap gap-3">
                {!person.is_verified && (
                  <PermissionGate permission="tenants.update" hide>
                    <Button variant="outline" size="sm" onClick={handleVerify}>
                      <BadgeCheck className="mr-2 h-4 w-4 text-emerald-600" />
                      Verify Identity
                    </Button>
                  </PermissionGate>
                )}
                {person.is_verified && (
                  <Button variant="outline" size="sm" disabled>
                    <BadgeCheck className="mr-2 h-4 w-4 text-emerald-600" />
                    Identity Verified
                  </Button>
                )}
                {!person.is_blocked ? (
                  <PermissionGate permission="tenants.update" hide>
                    <Button variant="outline" size="sm" onClick={handleBlock} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Ban className="mr-2 h-4 w-4" />
                      Block Person
                    </Button>
                  </PermissionGate>
                ) : (
                  <PermissionGate permission="tenants.update" hide>
                    <Button variant="outline" size="sm" onClick={handleUnblock} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                      <Shield className="mr-2 h-4 w-4" />
                      Unblock Person
                    </Button>
                  </PermissionGate>
                )}
              </div>
            </div>
          </div>
        </DetailSection>
      </div>
    </PermissionGuard>
  )
}
