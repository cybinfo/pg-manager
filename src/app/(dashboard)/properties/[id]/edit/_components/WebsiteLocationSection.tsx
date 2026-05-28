"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  googleMapsUrl: string
  nearbyLandmarks: string[]
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteLocationSection({ googleMapsUrl, nearbyLandmarks, onWebsiteChange }: Props) {
  const [newLandmark, setNewLandmark] = useState("")

  const addLandmark = () => {
    if (newLandmark.trim()) {
      onWebsiteChange("nearby_landmarks", [...nearbyLandmarks, newLandmark.trim()])
      setNewLandmark("")
    }
  }

  const removeLandmark = (index: number) => {
    onWebsiteChange("nearby_landmarks", nearbyLandmarks.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Location Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Google Maps URL">
          <Input
            placeholder="https://maps.google.com/..."
            value={googleMapsUrl}
            onChange={(e) => onWebsiteChange("google_maps_url", e.target.value)}
          />
        </FormField>

        <div className="space-y-2">
          <Label>Nearby Landmarks</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Metro Station - 500m"
              value={newLandmark}
              onChange={(e) => setNewLandmark(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLandmark())}
            />
            <Button type="button" variant="outline" onClick={addLandmark}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {nearbyLandmarks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {nearbyLandmarks.map((landmark, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {landmark}
                  <button
                    type="button"
                    onClick={() => removeLandmark(i)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
