"use client"

import type { WebsiteData, OnWebsiteChange } from "./WebsiteTypes"
import { WebsiteEnableCard } from "./WebsiteEnableCard"
import { WebsiteUrlSection } from "./WebsiteUrlSection"
import { WebsiteBasicInfoSection } from "./WebsiteBasicInfoSection"
import { WebsiteMediaSection } from "./WebsiteMediaSection"
import { WebsiteAmenitiesSection } from "./WebsiteAmenitiesSection"
import { WebsiteHouseRulesSection } from "./WebsiteHouseRulesSection"
import { WebsiteLocationSection } from "./WebsiteLocationSection"
import { WebsiteContactSection } from "./WebsiteContactSection"
import { WebsiteDisplaySection } from "./WebsiteDisplaySection"

export type { WebsiteConfig, WebsiteData } from "./WebsiteTypes"

interface WebsiteSettingsTabProps {
  websiteData: WebsiteData
  onWebsiteChange: OnWebsiteChange
  propertyName: string
}

export function WebsiteSettingsTab({
  websiteData,
  onWebsiteChange,
  propertyName,
}: WebsiteSettingsTabProps) {
  const cfg = websiteData.website_config

  return (
    <div className="space-y-6">
      <WebsiteEnableCard websiteData={websiteData} onWebsiteChange={onWebsiteChange} />

      {websiteData.website_enabled && (
        <>
          <WebsiteUrlSection
            slug={websiteData.website_slug}
            propertyName={propertyName}
            onWebsiteChange={onWebsiteChange}
          />
          <WebsiteBasicInfoSection config={cfg} onWebsiteChange={onWebsiteChange} />
          <WebsiteMediaSection coverPhotoUrl={cfg.cover_photo_url} onWebsiteChange={onWebsiteChange} />
          <WebsiteAmenitiesSection amenities={cfg.amenities} onWebsiteChange={onWebsiteChange} />
          <WebsiteHouseRulesSection houseRules={cfg.house_rules} onWebsiteChange={onWebsiteChange} />
          <WebsiteLocationSection
            googleMapsUrl={cfg.google_maps_url}
            nearbyLandmarks={cfg.nearby_landmarks}
            onWebsiteChange={onWebsiteChange}
          />
          <WebsiteContactSection
            contactWhatsapp={cfg.contact_whatsapp}
            contactEmail={cfg.contact_email}
            onWebsiteChange={onWebsiteChange}
          />
          <WebsiteDisplaySection config={cfg} onWebsiteChange={onWebsiteChange} />
        </>
      )}
    </div>
  )
}
