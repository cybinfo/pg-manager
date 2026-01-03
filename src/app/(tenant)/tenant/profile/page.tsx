"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Home,
  CreditCard,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Flag,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { PageLoader } from "@/components/ui/page-loader"
import { ReportIssueDialog, ApprovalType } from "@/components/tenant/report-issue-dialog"
import { formatDistanceToNow } from "date-fns"
import { formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"

interface TenantProfile {
  id: string
  name: string
  phone: string
  email: string | null
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  check_in_date: string
  check_out_date: string | null
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, unknown> | null
  workspace_id: string
  owner_id: string
  property: {
    name: string
    address: string | null
    city: string
    state: string | null
    owner_id: string
  }
  room: {
    room_number: string
    room_type: string
    floor: number | null
    amenities: string[] | null
    has_ac: boolean
    has_attached_bathroom: boolean
  }
}

interface ApprovalRequest {
  id: string
  type: string
  status: string
  description: string | null
  payload: Record<string, unknown>
  created_at: string
  decided_at: string | null
}

export default function TenantProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [showRequests, setShowRequests] = useState(false)

  // Report Issue Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<{
    label: string
    value: string
    type: ApprovalType
  } | null>(null)

  const fetchRequests = async (tenantId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("approvals")
      .select("id, type, status, description, payload, created_at, decided_at")
      .eq("requester_tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setRequests(data)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email || "")

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(name, address, city, state, owner_id),
          room:rooms(room_number, room_type, floor, amenities, has_ac, has_attached_bathroom)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (data) {
        // Handle Supabase array joins
        const property = Array.isArray(data.property) ? data.property[0] : data.property
        const ownerId = property?.owner_id || data.owner_id

        // Fetch workspace_id from workspaces table via owner
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_user_id", ownerId)
          .single()

        const transformedData = {
          ...data,
          property,
          room: Array.isArray(data.room) ? data.room[0] : data.room,
          owner_id: ownerId,
          workspace_id: workspace?.id || "",
        }
        setProfile(transformedData)
        // Fetch approval requests
        fetchRequests(data.id)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const openReportDialog = (label: string, value: string, type: ApprovalType) => {
    setSelectedField({ label, value, type })
    setDialogOpen(true)
  }

  const handleRequestSuccess = () => {
    if (profile) {
      fetchRequests(profile.id)
    }
  }


  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Verified
          </span>
        )
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            <Clock className="h-3 w-3" />
            Submitted
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            N/A
          </span>
        )
    }
  }

  if (loading) {
    return <PageLoader />
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground">Unable to load your profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Your personal and tenancy information</p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar name={profile.name} src={profile.profile_photo || profile.photo_url} size="xl" className="bg-primary text-primary-foreground" />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-muted-foreground">
                {profile.property.name} • Room {profile.room.room_number}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Active Tenant
                </span>
                {profile.agreement_signed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    <FileText className="h-3 w-3" />
                    Agreement Signed
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name Field */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => openReportDialog("Name", profile.name, "name_change")}
                title="Report issue with name"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            {/* Phone Field */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => openReportDialog("Phone Number", profile.phone, "phone_change")}
                title="Report issue with phone"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            {/* Email Field */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{userEmail || profile.email || "Not provided"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => openReportDialog("Email", userEmail || profile.email || "", "email_change")}
                title="Report issue with email"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {profile.custom_fields && Object.keys(profile.custom_fields).length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              {Object.entries(profile.custom_fields).map(([key, value]) => {
                if (!value) return null
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                return (
                  <div key={key} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => openReportDialog(label, String(value), "other")}
                      title={`Report issue with ${label.toLowerCase()}`}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenancy Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tenancy Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Check-in Date</p>
                <p className="font-medium">{formatDate(profile.check_in_date)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => openReportDialog("Check-in Date", formatDate(profile.check_in_date), "tenancy_issue")}
                title="Report issue with check-in date"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium text-lg">₹{profile.monthly_rent.toLocaleString("en-IN")}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => openReportDialog("Monthly Rent", `₹${profile.monthly_rent.toLocaleString("en-IN")}`, "tenancy_issue")}
                title="Report issue with monthly rent"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Police Verification</p>
              <div className="mt-1">
                {getVerificationBadge(profile.police_verification_status)}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Agreement Status</p>
              <div className="mt-1">
                {profile.agreement_signed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Signed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property & Room Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property & Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">{profile.property.name}</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                {profile.property.address && `${profile.property.address}, `}
                {profile.property.city}
                {profile.property.state && `, ${profile.property.state}`}
              </p>
            </div>
          </div>

          {/* Room */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Home className="h-4 w-4" />
                Room {profile.room.room_number}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground capitalize">
                  {profile.room.room_type || "Standard"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                  onClick={() => openReportDialog(
                    "Room Assignment",
                    `Room ${profile.room.room_number} (${profile.room.room_type || "Standard"})`,
                    "room_issue"
                  )}
                  title="Report issue with room assignment"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {profile.room.floor !== null && (
                <div className="p-2 bg-muted rounded text-center relative group">
                  <p className="text-muted-foreground text-xs">Floor</p>
                  <p className="font-medium">{profile.room.floor}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openReportDialog("Floor", String(profile.room.floor), "room_issue")}
                    title="Report issue with floor"
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="p-2 bg-muted rounded text-center relative group">
                <p className="text-muted-foreground text-xs">AC</p>
                <p className="font-medium">{profile.room.has_ac ? "Yes" : "No"}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openReportDialog("AC Status", profile.room.has_ac ? "Yes" : "No", "room_issue")}
                  title="Report issue with AC status"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2 bg-muted rounded text-center relative group">
                <p className="text-muted-foreground text-xs">Attached Bath</p>
                <p className="font-medium">{profile.room.has_attached_bathroom ? "Yes" : "No"}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openReportDialog("Attached Bathroom", profile.room.has_attached_bathroom ? "Yes" : "No", "room_issue")}
                  title="Report issue with attached bathroom"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {profile.room.amenities && profile.room.amenities.length > 0 && (
              <div className="mt-4 relative group">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openReportDialog("Amenities", profile.room.amenities?.join(", ") || "", "room_issue")}
                    title="Report issue with amenities"
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.room.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Requests Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowRequests(!showRequests)}
        >
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Requests
              {requests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-muted rounded-full">
                  {requests.length}
                </span>
              )}
            </div>
            {showRequests ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {showRequests && (
          <CardContent className="pt-0">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No requests submitted yet. Use the flag icons above to report any issues.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const typeLabel = request.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{typeLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          request.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : request.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {request.status === "approved" && <CheckCircle className="h-3 w-3" />}
                        {request.status === "rejected" && <AlertCircle className="h-3 w-3" />}
                        {request.status === "pending" && <Clock className="h-3 w-3" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Need to update your information?</strong> Click the <Flag className="h-3 w-3 inline text-amber-500" /> icon next to any field to submit a change request. Your administrator will review and process it.
          </p>
        </CardContent>
      </Card>

      {/* Report Issue Dialog */}
      {selectedField && profile.owner_id && (
        <ReportIssueDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fieldLabel={selectedField.label}
          currentValue={selectedField.value}
          approvalType={selectedField.type}
          tenantId={profile.id}
          workspaceId={profile.workspace_id}
          ownerId={profile.owner_id}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  )
}
