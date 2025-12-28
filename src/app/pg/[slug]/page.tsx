"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Wifi,
  Car,
  Utensils,
  Shield,
  Zap,
  Droplets,
  Wind,
  Tv,
  Dumbbell,
  Loader2,
  CheckCircle,
  Star,
  Users,
  Home,
  Calendar,
  ArrowRight,
  ExternalLink,
  Clock,
  Send
} from "lucide-react"
import { toast } from "sonner"

interface PropertyWebsite {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  manager_phone: string | null
  website_config: {
    tagline?: string
    description?: string
    property_type?: string
    established_year?: number
    cover_photo_url?: string
    gallery?: string[]
    amenities?: string[]
    house_rules?: string
    google_maps_url?: string
    nearby_landmarks?: string[]
    contact_whatsapp?: string
    contact_email?: string
    show_rooms?: boolean
    show_pricing?: boolean
    show_contact_form?: boolean
  }
  owner: {
    business_name: string | null
    name: string
    phone: string | null
    email: string
  }
  rooms: Array<{
    id: string
    room_number: string
    room_type: string
    rent_amount: number
    total_beds: number
    occupied_beds: number
    amenities: string[]
    has_ac: boolean
    has_attached_bathroom: boolean
    status: string
  }>
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Food": Utensils,
  "CCTV": Shield,
  "Power Backup": Zap,
  "Water Supply": Droplets,
  "AC": Wind,
  "TV": Tv,
  "Gym": Dumbbell,
}

const defaultAmenities = [
  "WiFi", "Parking", "Food", "CCTV", "Power Backup",
  "Water Supply", "Laundry", "Housekeeping", "Security"
]

export default function PGWebsitePage() {
  const params = useParams()
  const slug = params.slug as string

  const [property, setProperty] = useState<PropertyWebsite | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    preferred_room_type: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchProperty = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          address,
          city,
          state,
          pincode,
          manager_phone,
          website_config,
          owner:owners(business_name, name, phone, email),
          rooms(id, room_number, room_type, rent_amount, total_beds, occupied_beds, amenities, has_ac, has_attached_bathroom, status)
        `)
        .eq("website_slug", slug)
        .eq("website_enabled", true)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Transform data
      const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner
      const transformedData: PropertyWebsite = {
        ...data,
        website_config: data.website_config || {},
        owner: owner || { business_name: null, name: "Property Owner", phone: null, email: "" },
        rooms: (data.rooms || []).filter((r: { status: string }) => r.status !== "maintenance"),
      }

      setProperty(transformedData)
      setLoading(false)
    }

    if (slug) {
      fetchProperty()
    }
  }, [slug])

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inquiryForm.name || !inquiryForm.phone) {
      toast.error("Please fill in required fields")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("website_inquiries").insert({
        property_id: property?.id,
        owner_id: property?.owner?.email ? undefined : undefined, // Will be set by trigger
        name: inquiryForm.name,
        phone: inquiryForm.phone,
        email: inquiryForm.email || null,
        message: inquiryForm.message || null,
        preferred_room_type: inquiryForm.preferred_room_type || null,
      })

      if (error) throw error

      setSubmitted(true)
      toast.success("Inquiry submitted successfully!")
    } catch (error) {
      console.error("Error submitting inquiry:", error)
      toast.error("Failed to submit inquiry. Please try calling directly.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getWhatsAppLink = (phone: string, message: string) => {
    const formattedPhone = phone.replace(/\D/g, "")
    const finalPhone = formattedPhone.startsWith("91") ? formattedPhone : `91${formattedPhone}`
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center max-w-md px-4">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This property page doesn&apos;t exist or is not publicly available.
          </p>
          <Link href="/">
            <Button>Go to ManageKar</Button>
          </Link>
        </div>
      </div>
    )
  }

  const config = property?.website_config || {}
  const amenities = config.amenities || defaultAmenities
  const propertyType = config.property_type === "hostel" ? "Hostel" : config.property_type === "coliving" ? "Co-Living" : "PG"

  // Group rooms by type
  const roomsByType = property?.rooms.reduce((acc, room) => {
    const type = room.room_type || "other"
    if (!acc[type]) {
      acc[type] = { rooms: [], minPrice: Infinity, maxPrice: 0, available: 0 }
    }
    acc[type].rooms.push(room)
    acc[type].minPrice = Math.min(acc[type].minPrice, room.rent_amount)
    acc[type].maxPrice = Math.max(acc[type].maxPrice, room.rent_amount)
    if (room.total_beds > room.occupied_beds) {
      acc[type].available += room.total_beds - room.occupied_beds
    }
    return acc
  }, {} as Record<string, { rooms: typeof property.rooms, minPrice: number, maxPrice: number, available: number }>)

  const whatsappMessage = `Hi, I found your ${propertyType} "${property?.name}" on ManageKar and I'm interested in knowing more about room availability and rent. Please share the details.`

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative">
        <div
          className="h-[50vh] md:h-[60vh] bg-cover bg-center relative"
          style={{
            backgroundImage: config.cover_photo_url
              ? `url(${config.cover_photo_url})`
              : "linear-gradient(135deg, #14B8A6 0%, #10B981 100%)"
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 pb-8 md:pb-12">
              <div className="max-w-3xl text-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-teal-500 rounded-full text-sm font-medium">
                    {propertyType}
                  </span>
                  {config.established_year && (
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      Est. {config.established_year}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2">
                  {property?.name}
                </h1>
                {config.tagline && (
                  <p className="text-xl md:text-2xl text-white/90 mb-4">
                    {config.tagline}
                  </p>
                )}
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-5 w-5" />
                  <span>
                    {property?.address && `${property.address}, `}
                    {property?.city}
                    {property?.state && `, ${property.state}`}
                    {property?.pincode && ` - ${property.pincode}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="flex flex-wrap gap-3">
            {(config.contact_whatsapp || property?.manager_phone) && (
              <a
                href={getWhatsAppLink(config.contact_whatsapp || property?.manager_phone || "", whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-green-600 hover:bg-green-700 shadow-lg">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp Inquiry
                </Button>
              </a>
            )}
            {property?.manager_phone && (
              <a href={`tel:${property.manager_phone}`}>
                <Button size="lg" variant="secondary" className="shadow-lg">
                  <Phone className="mr-2 h-5 w-5" />
                  Call Now
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {config.description && (
              <section>
                <h2 className="text-2xl font-bold mb-4">About Us</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {config.description}
                </p>
              </section>
            )}

            {/* Amenities */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {amenities.map((amenity, i) => {
                  const Icon = amenityIcons[amenity] || CheckCircle
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-teal-600" />
                      </div>
                      <span className="font-medium">{amenity}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Rooms & Pricing */}
            {config.show_rooms !== false && roomsByType && Object.keys(roomsByType).length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Rooms & Pricing</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(roomsByType).map(([type, data]) => (
                    <Card key={type} className="overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white">
                        <h3 className="text-lg font-semibold capitalize">{type} Room</h3>
                        <p className="text-teal-100 text-sm">
                          {data.rooms.length} {data.rooms.length === 1 ? "room" : "rooms"} available
                        </p>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-baseline justify-between mb-3">
                          {config.show_pricing !== false ? (
                            <div>
                              <span className="text-2xl font-bold text-teal-600">
                                {formatPrice(data.minPrice)}
                              </span>
                              {data.maxPrice > data.minPrice && (
                                <span className="text-muted-foreground">
                                  {" "}- {formatPrice(data.maxPrice)}
                                </span>
                              )}
                              <span className="text-muted-foreground text-sm">/month</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Contact for pricing</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>
                              {data.available} {data.available === 1 ? "bed" : "beds"} available
                            </span>
                          </div>
                        </div>
                        {data.rooms.some(r => r.has_ac || r.has_attached_bathroom) && (
                          <div className="flex gap-2 mt-3">
                            {data.rooms.some(r => r.has_ac) && (
                              <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs">
                                AC Available
                              </span>
                            )}
                            {data.rooms.some(r => r.has_attached_bathroom) && (
                              <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs">
                                Attached Bath
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* House Rules */}
            {config.house_rules && (
              <section>
                <h2 className="text-2xl font-bold mb-4">House Rules</h2>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground whitespace-pre-line">
                      {config.house_rules}
                    </p>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Location */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Location</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="h-5 w-5 text-teal-600 mt-1" />
                    <div>
                      <p className="font-medium">{property?.name}</p>
                      <p className="text-muted-foreground">
                        {property?.address && `${property.address}, `}
                        {property?.city}
                        {property?.state && `, ${property.state}`}
                        {property?.pincode && ` - ${property.pincode}`}
                      </p>
                    </div>
                  </div>

                  {config.nearby_landmarks && config.nearby_landmarks.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Nearby</h4>
                      <div className="flex flex-wrap gap-2">
                        {config.nearby_landmarks.map((landmark, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-muted rounded-full text-sm"
                          >
                            {landmark}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.google_maps_url && (
                    <a
                      href={config.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-teal-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Google Maps
                    </a>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column - Contact Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Get in Touch</h3>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-6">
                    {property?.manager_phone && (
                      <a
                        href={`tel:${property.manager_phone}`}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Phone className="h-5 w-5 text-teal-600" />
                        <span>{property.manager_phone}</span>
                      </a>
                    )}
                    {config.contact_email && (
                      <a
                        href={`mailto:${config.contact_email}`}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Mail className="h-5 w-5 text-teal-600" />
                        <span className="truncate">{config.contact_email}</span>
                      </a>
                    )}
                  </div>

                  {/* Inquiry Form */}
                  {config.show_contact_form !== false && (
                    <>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or send inquiry
                          </span>
                        </div>
                      </div>

                      {submitted ? (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <h4 className="font-semibold mb-2">Inquiry Submitted!</h4>
                          <p className="text-muted-foreground text-sm">
                            We&apos;ll get back to you soon.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleInquirySubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                              id="name"
                              placeholder="Your name"
                              value={inquiryForm.name}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="Your phone number"
                              value={inquiryForm.phone}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, phone: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Your email (optional)"
                              value={inquiryForm.email}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="room_type">Preferred Room Type</Label>
                            <select
                              id="room_type"
                              className="w-full h-10 px-3 rounded-md border bg-background"
                              value={inquiryForm.preferred_room_type}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, preferred_room_type: e.target.value }))}
                            >
                              <option value="">Select type</option>
                              <option value="single">Single</option>
                              <option value="double">Double Sharing</option>
                              <option value="triple">Triple Sharing</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <textarea
                              id="message"
                              className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background resize-none"
                              placeholder="Any specific requirements..."
                              value={inquiryForm.message}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Inquiry
                              </>
                            )}
                          </Button>
                        </form>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Powered By */}
              <div className="text-center mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Powered by ManageKar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
