"use client"

import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  coverPhotoUrl: string
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteMediaSection({ coverPhotoUrl, onWebsiteChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cover Photo</CardTitle>
        <CardDescription>
          Add a URL to your PG&apos;s main photo (upload to Imgur, Google Drive, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Input
            placeholder="https://example.com/your-pg-photo.jpg"
            value={coverPhotoUrl}
            onChange={(e) => onWebsiteChange("cover_photo_url", e.target.value)}
          />
          {coverPhotoUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border relative h-48">
              <Image
                src={coverPhotoUrl}
                alt="Cover preview"
                fill
                className="object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
