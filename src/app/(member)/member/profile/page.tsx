"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  BookOpen,
  Armchair,
  Lock,
  FileText,
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { ProfileFieldRow } from "@/components/portal"
import { formatDate } from "@/lib/format"

interface MemberProfile {
  id: string
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  join_date: string
  expiry_date: string | null
  status: string
  id_proof_type: string | null
  id_proof_number: string | null
  notes: string | null
  library: {
    name: string
    phone: string | null
    address: string | null
    city: string | null
    opening_time: string | null
    closing_time: string | null
  } | null
  assigned_seat: {
    seat_number: string
    section: {
      name: string
    } | null
  } | null
  locker: {
    locker_number: string
  } | null
  current_subscription: {
    plan_name: string
    hours_included: number | null
    start_date: string
    end_date: string
    status: string
  } | null
  person: {
    name: string
    photo_url: string | null
  } | null
}

export default function MemberProfilePage() {
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberProfile | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: memberData } = await supabase
        .from("library_members")
        .select(`
          id,
          name,
          phone,
          email,
          member_code,
          hours_balance,
          hours_used,
          preferred_slot,
          join_date,
          expiry_date,
          status,
          id_proof_type,
          id_proof_number,
          notes,
          library:libraries(name, phone, address, city, opening_time, closing_time),
          assigned_seat:library_seats(seat_number, section:library_sections(name)),
          locker:library_lockers(locker_number),
          current_subscription:library_memberships!library_members_current_subscription_id_fkey(
            plan_name, hours_included, start_date, end_date, status
          ),
          person:people(name, photo_url)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (memberData) {
        // Transform joins
        const library = Array.isArray(memberData.library)
          ? memberData.library[0]
          : memberData.library
        const assignedSeat = Array.isArray(memberData.assigned_seat)
          ? memberData.assigned_seat[0]
          : memberData.assigned_seat
        const locker = Array.isArray(memberData.locker)
          ? memberData.locker[0]
          : memberData.locker
        const subscription = Array.isArray(memberData.current_subscription)
          ? memberData.current_subscription[0]
          : memberData.current_subscription
        const person = Array.isArray(memberData.person)
          ? memberData.person[0]
          : memberData.person

        // Transform nested seat section
        if (assignedSeat && assignedSeat.section) {
          assignedSeat.section = Array.isArray(assignedSeat.section)
            ? assignedSeat.section[0]
            : assignedSeat.section
        }

        setMember({
          ...memberData,
          library,
          assigned_seat: assignedSeat,
          locker,
          current_subscription: subscription,
          person,
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!member) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Member profile not found</p>
      </div>
    )
  }

  const displayName = member.person?.name || member.name
  const photoUrl = member.person?.photo_url

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Your membership details</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} src={photoUrl || undefined} size="xl" />
            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {member.member_code && (
                <p className="font-mono text-muted-foreground">{member.member_code}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
                {member.preferred_slot && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    {member.preferred_slot}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileFieldRow
              icon={Phone}
              label="Phone"
              value={member.phone || "-"}
            />
            <ProfileFieldRow
              icon={Mail}
              label="Email"
              value={member.email || "-"}
            />
            <ProfileFieldRow
              icon={Calendar}
              label="Join Date"
              value={formatDate(member.join_date)}
            />
            {member.expiry_date && (
              <ProfileFieldRow
                icon={Calendar}
                label="Expiry Date"
                value={formatDate(member.expiry_date)}
              />
            )}
          </CardContent>
        </Card>

        {/* Library Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Library Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Library</p>
              <p className="font-medium">{member.library?.name || "-"}</p>
              {member.library?.address && (
                <p className="text-sm text-muted-foreground">
                  {member.library.address}{member.library.city ? `, ${member.library.city}` : ""}
                </p>
              )}
            </div>
            {member.library?.phone && (
              <ProfileFieldRow
                icon={Phone}
                label="Library Contact"
                value={member.library.phone}
              />
            )}
            {(member.library?.opening_time || member.library?.closing_time) && (
              <ProfileFieldRow
                icon={Clock}
                label="Timing"
                value={`${member.library.opening_time || "?"} - ${member.library.closing_time || "?"}`}
              />
            )}
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.current_subscription ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium">{member.current_subscription.plan_name}</p>
                </div>
                {member.current_subscription.hours_included && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Package</p>
                    <p className="font-medium">{member.current_subscription.hours_included}h</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{formatDate(member.current_subscription.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{formatDate(member.current_subscription.end_date)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Used</p>
                    <p className="font-medium text-amber-600">{member.hours_used?.toFixed(1) || 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Remaining</p>
                    <p className="font-medium text-emerald-600">{member.hours_balance?.toFixed(1) || 0}h</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No active subscription</p>
            )}
          </CardContent>
        </Card>

        {/* Seat & Locker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Armchair className="h-5 w-5" />
              Seat & Locker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileFieldRow
              icon={Armchair}
              label="Assigned Seat"
              value={
                member.assigned_seat
                  ? `${member.assigned_seat.seat_number}${member.assigned_seat.section ? ` (${member.assigned_seat.section.name})` : ""}`
                  : "No seat assigned"
              }
            />
            <ProfileFieldRow
              icon={Lock}
              label="Locker"
              value={
                member.locker
                  ? `#${member.locker.locker_number}`
                  : "No locker assigned"
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* ID Proof */}
      {(member.id_proof_type || member.id_proof_number) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ID Proof
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {member.id_proof_type && (
                <div>
                  <p className="text-sm text-muted-foreground">ID Type</p>
                  <p className="font-medium capitalize">{member.id_proof_type.replace("_", " ")}</p>
                </div>
              )}
              {member.id_proof_number && (
                <div>
                  <p className="text-sm text-muted-foreground">ID Number</p>
                  <p className="font-medium font-mono">{member.id_proof_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
