import { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { transformJoin } from "@/lib/supabase/transforms"
import { PublicPropertyPage } from "./client"
import { CONTACT } from "@/lib/constants/contact"

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyWebsite {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  manager_phone: string | null
  owner_id: string
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

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getProperty(slug: string): Promise<PropertyWebsite | null> {
  const supabase = await createClient()

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
      owner_id,
      website_config,
      owner:owners(business_name, name, phone, email),
      rooms(id, room_number, room_type, rent_amount, total_beds, occupied_beds, amenities, has_ac, has_attached_bathroom, status)
    `)
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .is("deleted_at", null)
    .single()

  if (error || !data) {
    return null
  }

  // Transform data (handle Supabase join array format)
  const owner = transformJoin(data.owner)

  return {
    ...data,
    website_config: data.website_config || {},
    owner: owner || { business_name: null, name: "Property Owner", phone: null, email: "" },
    rooms: (data.rooms || []).filter((r: { status: string }) => r.status !== "maintenance"),
  } as PropertyWebsite
}

// ============================================================================
// SEO METADATA
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await getProperty(slug)

  if (!property) {
    return {
      title: "Property Not Found | ManageKar",
      description: "This property page doesn't exist or is not publicly available.",
    }
  }

  const config = property.website_config
  const propertyType = config.property_type === "hostel" ? "Hostel" : config.property_type === "coliving" ? "Co-Living" : "PG"
  const title = `${property.name} - ${propertyType} in ${property.city} | ManageKar`
  const description = config.description
    ? config.description.slice(0, 160)
    : `${propertyType} accommodation in ${property.city}. ${config.tagline || "Quality living at affordable prices."}`

  // Get price range for structured data
  const prices = property.rooms.map(r => r.rent_amount).filter(p => p > 0)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

  return {
    title,
    description,
    keywords: [
      `${propertyType} in ${property.city}`,
      `paying guest ${property.city}`,
      `hostel ${property.city}`,
      `room for rent ${property.city}`,
      property.name,
      ...(config.amenities || []),
    ],
    openGraph: {
      title,
      description,
      type: "website",
      url: `${CONTACT.APP_URL}/pg/${slug}`,
      siteName: "ManageKar",
      images: config.cover_photo_url
        ? [
            {
              url: config.cover_photo_url,
              width: 1200,
              height: 630,
              alt: property.name,
            },
          ]
        : [],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: config.cover_photo_url ? [config.cover_photo_url] : [],
    },
    alternates: {
      canonical: `${CONTACT.APP_URL}/pg/${slug}`,
    },
    other: minPrice
      ? {
          "price:amount": minPrice.toString(),
          "price:currency": "INR",
        }
      : {},
  }
}

// ============================================================================
// PAGE COMPONENT (Server)
// ============================================================================

export default async function PGWebsitePage({ params }: PageProps) {
  const { slug } = await params
  const property = await getProperty(slug)

  if (!property) {
    notFound()
  }

  // Add JSON-LD structured data for SEO
  const config = property.website_config
  const propertyType = config.property_type === "hostel" ? "Hostel" : config.property_type === "coliving" ? "Co-Living" : "PG"
  const prices = property.rooms.map(r => r.rent_amount).filter(p => p > 0)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: config.description || config.tagline,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.pincode,
      addressCountry: "IN",
    },
    telephone: property.manager_phone,
    email: config.contact_email,
    image: config.cover_photo_url,
    url: `https://managekar.com/pg/${slug}`,
    priceRange: minPrice ? `₹${minPrice}/month` : undefined,
    amenityFeature: (config.amenities || []).map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicPropertyPage property={property} />
    </>
  )
}
