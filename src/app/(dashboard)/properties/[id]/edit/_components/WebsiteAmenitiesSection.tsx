"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WEBSITE_AMENITIES } from "@/lib/constants/form-options"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  amenities: string[]
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteAmenitiesSection({ amenities, onWebsiteChange }: Props) {
  const toggleAmenity = (amenity: string) => {
    const updated = amenities.includes(amenity)
      ? amenities.filter((a) => a !== amenity)
      : [...amenities, amenity]
    onWebsiteChange("amenities", updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Amenities</CardTitle>
        <CardDescription>Select the facilities available at your PG</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {WEBSITE_AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-4 py-2 rounded-full border transition-colors ${
                amenities.includes(amenity)
                  ? "bg-primary text-white border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
