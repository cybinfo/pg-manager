export interface WebsiteConfig {
  tagline: string
  description: string
  property_type: string
  established_year: string
  cover_photo_url: string
  gallery: string[]
  amenities: string[]
  house_rules: string
  google_maps_url: string
  nearby_landmarks: string[]
  contact_whatsapp: string
  contact_email: string
  show_rooms: boolean
  show_pricing: boolean
  show_contact_form: boolean
}

export interface WebsiteData {
  website_slug: string
  website_enabled: boolean
  website_config: WebsiteConfig
}

export type OnWebsiteChange = (field: string, value: string | boolean | string[]) => void
