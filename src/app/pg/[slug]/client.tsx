"use client"

import { useState, useMemo } from "react"
import { getTodayISO } from "@/lib/date-helpers"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { brandGradient } from "@/lib/design-tokens"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/form-components"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Users,
  ExternalLink,
  Send,
  Share2,
  Copy,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Shirt,
  Sparkles,
  ShieldCheck,
  Bath,
  BedDouble,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency, formatPhone } from "@/lib/format"
import { generateWhatsAppLink } from "@/lib/notifications"
import { validatePhone as validateIndianMobile } from "@/lib/phone"
import type { PropertyWebsite } from "./page"
import { logger } from "@/lib/logger"
import { RATE_LIMIT_WINDOW, MAX_SUBMISSIONS } from "@/lib/constants/business-rules"

// ============================================================================
// CONSTANTS
// ============================================================================

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
  "Laundry": Shirt,
  "Housekeeping": Sparkles,
  "Security": ShieldCheck,
  "Attached Bathroom": Bath,
  "Furnished": BedDouble,
}

const defaultAmenities = [
  "WiFi", "Parking", "Food", "CCTV", "Power Backup",
  "Water Supply", "Laundry", "Housekeeping", "Security"
]

// ============================================================================
// TYPES
// ============================================================================

interface InquiryForm {
  name: string
  phone: string
  email: string
  message: string
  preferred_room_type: string
  expected_move_in: string
  // Honeypot field (should remain empty)
  website: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPropertyType(type?: string): string {
  switch (type) {
    case "hostel": return "Hostel"
    case "coliving": return "Co-Living"
    default: return "PG"
  }
}

function getUniqueRoomTypes(rooms: PropertyWebsite["rooms"]): string[] {
  const types = new Set(rooms.map(r => r.room_type).filter(Boolean))
  return Array.from(types)
}

// ============================================================================
// IMAGE GALLERY COMPONENT
// ============================================================================

function ImageGallery({ images, propertyName }: { images: string[]; propertyName: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const openLightbox = (index: number) => setSelectedIndex(index)
  const closeLightbox = () => setSelectedIndex(null)
  const goNext = () => setSelectedIndex((prev) => prev !== null ? (prev + 1) % images.length : null)
  const goPrev = () => setSelectedIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null)

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => openLightbox(i)}
            className="relative aspect-video rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`View image ${i + 1} of ${images.length}`}
          >
            <Image
              src={url}
              alt={`${propertyName} - Photo ${i + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Image {(selectedIndex ?? 0) + 1} of {images.length}</DialogTitle>
          <div className="relative aspect-video">
            {selectedIndex !== null && (
              <Image
                src={images[selectedIndex]}
                alt={`${propertyName} - Photo ${selectedIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            )}

            {/* Navigation */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
              {(selectedIndex ?? 0) + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// ============================================================================
// SHARE BUTTON COMPONENT
// ============================================================================

function ShareButton({ property, propertyType }: { property: PropertyWebsite; propertyType: string }) {
  const [showMenu, setShowMenu] = useState(false)

  const shareUrl = typeof window !== "undefined" ? window.location.href : ""
  const shareText = `Check out ${property.name} - ${propertyType} in ${property.city}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showSuccess("Link copied to clipboard!")
      setShowMenu(false)
    } catch {
      showError("Failed to copy link")
    }
  }

  const handleWhatsAppShare = () => {
    const url = generateWhatsAppLink("", `${shareText}\n${shareUrl}`)
    window.open(url.replace("wa.me/", "wa.me/send?text="), "_blank")
    setShowMenu(false)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // User cancelled
      }
    }
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="shadow-lg"
        aria-label="Share this property"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 bg-background border rounded-lg shadow-lg p-2 min-w-[160px]">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
              >
                <Share2 className="h-4 w-4" />
                More Options
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PublicPropertyPage({ property }: { property: PropertyWebsite }) {
  const [inquiryForm, setInquiryForm] = useState<InquiryForm>({
    name: "",
    phone: "",
    email: "",
    message: "",
    preferred_room_type: "",
    expected_move_in: "",
    website: "", // Honeypot
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const config = property.website_config || {}
  const amenities = config.amenities || defaultAmenities
  const propertyType = getPropertyType(config.property_type)
  const roomTypes = getUniqueRoomTypes(property.rooms)

  // Group rooms by type
  const roomsByType = useMemo(() => {
    return property.rooms.reduce((acc, room) => {
      const type = room.room_type || "other"
      if (!acc[type]) {
        acc[type] = { rooms: [], minPrice: Infinity, maxPrice: 0, available: 0 }
      }
      acc[type].rooms.push(room)
      // Only include positive rent amounts in price calculations
      if (room.rent_amount > 0) {
        acc[type].minPrice = Math.min(acc[type].minPrice, room.rent_amount)
        acc[type].maxPrice = Math.max(acc[type].maxPrice, room.rent_amount)
      }
      if (room.total_beds > room.occupied_beds) {
        acc[type].available += room.total_beds - room.occupied_beds
      }
      return acc
    }, {} as Record<string, { rooms: typeof property.rooms; minPrice: number; maxPrice: number; available: number }>)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.rooms])

  const whatsappMessage = `Hi, I found your ${propertyType} "${property.name}" on ManageKar and I'm interested in knowing more about room availability and rent. Please share the details.`

  // Rate limiting check (with localStorage fallback for privacy mode)
  const checkRateLimit = (): boolean => {
    try {
      const now = Date.now()
      const submissionsKey = `inquiry_submissions_${property.id}`
      const stored = localStorage.getItem(submissionsKey)
      const submissions: number[] = stored ? JSON.parse(stored) : []

      // Remove old submissions outside the window
      const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW)

      if (recentSubmissions.length >= MAX_SUBMISSIONS) {
        return false
      }

      // Add new submission
      recentSubmissions.push(now)
      localStorage.setItem(submissionsKey, JSON.stringify(recentSubmissions))
      return true
    } catch {
      // localStorage not available (private browsing, etc.) - allow submission
      return true
    }
  }

  // Simple email validation
  const isValidEmail = (email: string): boolean => {
    if (!email) return true // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Honeypot check - if filled, it's a bot
    if (inquiryForm.website) {
      // Silently "succeed" to not alert the bot
      setSubmitted(true)
      return
    }

    // Validate required fields
    if (!inquiryForm.name.trim() || !inquiryForm.phone.trim()) {
      showError("Please fill in required fields")
      return
    }

    // Validate name length (prevent excessively long names)
    if (inquiryForm.name.trim().length > 100) {
      showError("Name is too long (max 100 characters)")
      return
    }

    // Validate phone number
    const phoneValidation = validateIndianMobile(inquiryForm.phone)
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || "Invalid phone number")
      return
    }
    setPhoneError(null)

    // Validate email if provided
    if (inquiryForm.email.trim() && !isValidEmail(inquiryForm.email.trim())) {
      showError("Please enter a valid email address")
      return
    }

    // Rate limit check
    if (!checkRateLimit()) {
      showError("Too many submissions. Please try again later.")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("website_inquiries").insert({
        property_id: property.id,
        owner_id: property.owner_id,
        name: inquiryForm.name.trim(),
        phone: phoneValidation.normalized || inquiryForm.phone.trim(),
        email: inquiryForm.email.trim() || null,
        message: inquiryForm.message.trim() || null,
        preferred_room_type: inquiryForm.preferred_room_type || null,
        expected_move_in: inquiryForm.expected_move_in || null,
        source: "website",
      })

      if (error) throw error

      setSubmitted(true)
      showSuccess("Inquiry submitted successfully!")
    } catch (error) {
      logger.error("Error submitting inquiry:", { detail: error })
      showError("Failed to submit inquiry. Please try calling directly.")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setInquiryForm(prev => ({ ...prev, phone: value }))
    if (phoneError) {
      setPhoneError(null)
    }
  }

  const resetForm = () => {
    setInquiryForm({
      name: "",
      phone: "",
      email: "",
      message: "",
      preferred_room_type: "",
      expected_move_in: "",
      website: "",
    })
    setSubmitted(false)
    setPhoneError(null)
  }

  // Calculate total available beds
  const totalAvailable = Object.values(roomsByType).reduce((sum, data) => sum + data.available, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Hero Section */}
      <section className="relative">
        <div
          className={`h-[50vh] md:h-[60vh] bg-cover bg-center relative${!config.cover_photo_url ? " bg-gradient-to-br from-primary to-primary/70" : ""}`}
          style={config.cover_photo_url ? { backgroundImage: `url(${config.cover_photo_url})` } : undefined}
          role="img"
          aria-label={`${property.name} cover image`}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 pb-8 md:pb-12">
              <div className="max-w-3xl text-white">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-primary rounded-full text-sm font-medium">
                    {propertyType}
                  </span>
                  {config.established_year && (
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      Est. {config.established_year}
                    </span>
                  )}
                  {totalAvailable > 0 && (
                    <span className="px-3 py-1 bg-success rounded-full text-sm font-medium">
                      {totalAvailable} {totalAvailable === 1 ? "Bed" : "Beds"} Available
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2">
                  {property.name}
                </h1>
                {config.tagline && (
                  <p className="text-xl md:text-2xl text-white/90 mb-4">
                    {config.tagline}
                  </p>
                )}
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    {property.address && `${property.address}, `}
                    {property.city}
                    {property.state && `, ${property.state}`}
                    {property.pincode && ` - ${property.pincode}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="flex flex-wrap gap-3">
            {(config.contact_whatsapp || property.manager_phone) && (
              <a
                href={generateWhatsAppLink(config.contact_whatsapp || property.manager_phone || "", whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Send WhatsApp inquiry"
              >
                <Button size="lg" className="bg-success hover:bg-success/90 shadow-lg">
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  WhatsApp Inquiry
                </Button>
              </a>
            )}
            {property.manager_phone && (
              <a href={`tel:${property.manager_phone}`} aria-label={`Call ${formatPhone(property.manager_phone)}`}>
                <Button size="lg" variant="secondary" className="shadow-lg">
                  <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
                  Call Now
                </Button>
              </a>
            )}
            <ShareButton property={property} propertyType={propertyType} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {config.description && (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="text-2xl font-bold mb-4">About Us</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {config.description}
                </p>
              </section>
            )}

            {/* Image Gallery */}
            {config.gallery && config.gallery.length > 0 && (
              <ImageGallery images={config.gallery} propertyName={property.name} />
            )}

            {/* Amenities */}
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="text-2xl font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {amenities.map((amenity, i) => {
                  const Icon = amenityIcons[amenity] || CheckCircle
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <span className="font-medium">{amenity}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Rooms & Pricing */}
            {config.show_rooms !== false && roomsByType && Object.keys(roomsByType).length > 0 && (
              <section aria-labelledby="rooms-heading">
                <h2 id="rooms-heading" className="text-2xl font-bold mb-4">Rooms & Pricing</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(roomsByType).map(([type, data]) => (
                    <Card key={type} className="overflow-hidden">
                      <div className={`${brandGradient.horizontal} p-4 text-white`}>
                        <h3 className="text-lg font-semibold capitalize">{type} Room</h3>
                        <p className="text-white/80 text-sm">
                          {data.rooms.length} {data.rooms.length === 1 ? "room" : "rooms"}
                        </p>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-baseline justify-between mb-3">
                          {config.show_pricing !== false && data.minPrice !== Infinity ? (
                            <div>
                              <span className="text-2xl font-bold text-primary">
                                {formatCurrency(data.minPrice)}
                              </span>
                              {data.maxPrice > data.minPrice && (
                                <span className="text-muted-foreground">
                                  {" "}- {formatCurrency(data.maxPrice)}
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
                            <Users className="h-4 w-4" aria-hidden="true" />
                            <span>
                              {data.available > 0 ? (
                                <span className="text-success font-medium">
                                  {data.available} {data.available === 1 ? "bed" : "beds"} available
                                </span>
                              ) : (
                                <span className="text-destructive">No vacancy</span>
                              )}
                            </span>
                          </div>
                        </div>
                        {data.rooms.some(r => r.has_ac || r.has_attached_bathroom) && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {data.rooms.some(r => r.has_ac) && (
                              <span className="px-2 py-1 bg-info/10 text-info rounded text-xs">
                                AC Available
                              </span>
                            )}
                            {data.rooms.some(r => r.has_attached_bathroom) && (
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
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
              <section aria-labelledby="rules-heading">
                <h2 id="rules-heading" className="text-2xl font-bold mb-4">House Rules</h2>
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
            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="text-2xl font-bold mb-4">Location</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-muted-foreground">
                        {property.address && `${property.address}, `}
                        {property.city}
                        {property.state && `, ${property.state}`}
                        {property.pincode && ` - ${property.pincode}`}
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
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
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
                    {property.manager_phone && (
                      <a
                        href={`tel:${property.manager_phone}`}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        aria-label={`Call ${formatPhone(property.manager_phone)}`}
                      >
                        <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                        <span>{formatPhone(property.manager_phone)}</span>
                      </a>
                    )}
                    {config.contact_email && (
                      <a
                        href={`mailto:${config.contact_email}`}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        aria-label={`Email ${config.contact_email}`}
                      >
                        <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
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
                          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" aria-hidden="true" />
                          <h4 className="font-semibold mb-2">Inquiry Submitted!</h4>
                          <p className="text-muted-foreground text-sm mb-4">
                            We&apos;ll get back to you soon.
                          </p>
                          <Button variant="outline" size="sm" onClick={resetForm}>
                            Send Another Inquiry
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={handleInquirySubmit} className="space-y-4">
                          {/* Honeypot field - hidden from humans */}
                          <div className="hidden" aria-hidden="true">
                            <label htmlFor="website">Website</label>
                            <input
                              type="text"
                              id="website"
                              name="website"
                              value={inquiryForm.website}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, website: e.target.value }))}
                              tabIndex={-1}
                              autoComplete="off"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                            <Input
                              id="name"
                              placeholder="Your name"
                              value={inquiryForm.name}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, name: e.target.value }))}
                              required
                              aria-required="true"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="Your phone number"
                              value={inquiryForm.phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              required
                              aria-required="true"
                              aria-invalid={!!phoneError}
                              aria-describedby={phoneError ? "phone-error" : undefined}
                              className={phoneError ? "border-destructive" : ""}
                            />
                            {phoneError && (
                              <p id="phone-error" className="text-sm text-destructive" role="alert">
                                {phoneError}
                              </p>
                            )}
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
                            <Select
                              id="room_type"
                              value={inquiryForm.preferred_room_type}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, preferred_room_type: e.target.value }))}
                              options={[
                                { value: "", label: "Select type" },
                                ...roomTypes.map(type => ({
                                  value: type,
                                  label: type.charAt(0).toUpperCase() + type.slice(1) + " Room"
                                })),
                              ]}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="move_in">Expected Move-in Date</Label>
                            <div className="relative">
                              <Input
                                id="move_in"
                                type="date"
                                value={inquiryForm.expected_move_in}
                                onChange={(e) => setInquiryForm(prev => ({ ...prev, expected_move_in: e.target.value }))}
                                min={getTodayISO()}
                                className="pl-10"
                              />
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                              id="message"
                              placeholder="Any specific requirements..."
                              value={inquiryForm.message}
                              onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                              rows={3}
                            />
                          </div>

                          <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
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
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Powered by ManageKar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
