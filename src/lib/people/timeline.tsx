import { Home, Briefcase, BadgeCheck, Ban, Clock } from "lucide-react"
import type { JSX } from "react"

export interface TimelineEvent {
  id: string
  type: "tenant_join" | "tenant_leave" | "staff_join" | "verified" | "blocked"
  date: string
  title: string
  subtitle?: string
}

interface TenantInput {
  id: string
  check_in_date: string
  check_out_date: string | null
  property?: { name: string } | null
  room?: { room_number: string } | null
}

interface StaffInput {
  id: string
  is_active: boolean
  created_at: string
}

interface PersonInput {
  verified_at?: string | null
  is_blocked?: boolean
  blocked_at?: string | null
  blocked_reason?: string | null
}

export function buildPersonTimeline(
  tenants: TenantInput[],
  staffRoles: StaffInput[],
  person: PersonInput
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  tenants.forEach((t) => {
    events.push({
      id: `tenant_join_${t.id}`,
      type: "tenant_join",
      date: t.check_in_date,
      title: "Joined as Tenant",
      subtitle: `${t.property?.name || "Unknown"} - Room ${t.room?.room_number || "Unknown"}`,
    })

    if (t.check_out_date) {
      events.push({
        id: `tenant_leave_${t.id}`,
        type: "tenant_leave",
        date: t.check_out_date,
        title: "Checked Out",
        subtitle: `${t.property?.name || "Unknown"} - Room ${t.room?.room_number || "Unknown"}`,
      })
    }
  })

  staffRoles.forEach((s) => {
    events.push({
      id: `staff_join_${s.id}`,
      type: "staff_join",
      date: s.created_at,
      title: "Added as Staff",
      subtitle: s.is_active ? "Currently Active" : "No longer active",
    })
  })

  if (person.verified_at) {
    events.push({
      id: "verified",
      type: "verified",
      date: person.verified_at,
      title: "Identity Verified",
      subtitle: "Documents verified successfully",
    })
  }

  if (person.is_blocked && person.blocked_at) {
    events.push({
      id: "blocked",
      type: "blocked",
      date: person.blocked_at,
      title: "Account Blocked",
      subtitle: person.blocked_reason || "No reason provided",
    })
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getEventIcon(event: TimelineEvent): JSX.Element {
  switch (event.type) {
    case "tenant_join": return <Home className="h-4 w-4 text-info" />
    case "tenant_leave": return <Home className="h-4 w-4 text-muted-foreground" />
    case "staff_join": return <Briefcase className="h-4 w-4 text-success" />
    case "verified": return <BadgeCheck className="h-4 w-4 text-success" />
    case "blocked": return <Ban className="h-4 w-4 text-destructive" />
    default: return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export function getEventBg(event: TimelineEvent): string {
  switch (event.type) {
    case "tenant_join": return "bg-info/10"
    case "tenant_leave": return "bg-muted"
    case "staff_join": return "bg-success/10"
    case "verified": return "bg-success/10"
    case "blocked": return "bg-destructive/10"
    default: return "bg-muted"
  }
}
