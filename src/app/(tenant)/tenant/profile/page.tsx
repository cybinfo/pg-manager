"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
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
  AlertCircle
} from "lucide-react"

interface TenantProfile {
  id: string
  name: string
  phone: string
  email: string | null
  monthly_rent: number
  check_in_date: string
  check_out_date: string | null
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, any> | null
  property: {
    name: string
    address: string | null
    city: string
    state: string | null
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

export default function TenantProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")

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
          property:properties(name, address, city, state),
          room:rooms(room_number, room_type, floor, amenities, has_ac, has_attached_bathroom)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
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
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{userEmail || profile.email || "Not provided"}</p>
              </div>
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
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
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
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Check-in Date</p>
              <p className="font-medium">{formatDate(profile.check_in_date)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium text-lg">₹{profile.monthly_rent.toLocaleString("en-IN")}</p>
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
              <span className="text-sm text-muted-foreground capitalize">
                {profile.room.room_type || "Standard"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {profile.room.floor !== null && (
                <div className="p-2 bg-muted rounded text-center">
                  <p className="text-muted-foreground text-xs">Floor</p>
                  <p className="font-medium">{profile.room.floor}</p>
                </div>
              )}
              <div className="p-2 bg-muted rounded text-center">
                <p className="text-muted-foreground text-xs">AC</p>
                <p className="font-medium">{profile.room.has_ac ? "Yes" : "No"}</p>
              </div>
              <div className="p-2 bg-muted rounded text-center">
                <p className="text-muted-foreground text-xs">Attached Bath</p>
                <p className="font-medium">{profile.room.has_attached_bathroom ? "Yes" : "No"}</p>
              </div>
            </div>

            {profile.room.amenities && profile.room.amenities.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Amenities</p>
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

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Need to update your information?</strong> Please contact your PG administrator
            to request any changes to your profile details.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
