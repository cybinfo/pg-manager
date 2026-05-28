"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  slug: string
  propertyName: string
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteUrlSection({ slug, propertyName, onWebsiteChange }: Props) {
  const generateSlug = () => {
    const generated = propertyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50)
    onWebsiteChange("website_slug", generated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">URL Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Website Slug</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center">
              <span className="px-3 py-2 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                /pg/
              </span>
              <Input
                value={slug}
                onChange={(e) =>
                  onWebsiteChange(
                    "website_slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="your-pg-name"
                className="rounded-l-none"
              />
            </div>
            <Button type="button" variant="outline" onClick={generateSlug}>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use lowercase letters, numbers, and hyphens only
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
