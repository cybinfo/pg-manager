"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Globe, ExternalLink, Copy, CheckCircle } from "lucide-react"
import { showSuccess } from "@/lib/toast-helpers"
import { brandGradient } from "@/lib/design-tokens"
import type { WebsiteData, OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  websiteData: WebsiteData
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteEnableCard({ websiteData, onWebsiteChange }: Props) {
  const [copied, setCopied] = useState(false)

  const copyWebsiteUrl = () => {
    const url = `${window.location.origin}/pg/${websiteData.website_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showSuccess("Website URL copied!")
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${brandGradient.solid} flex items-center justify-center`}>
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Public PG Website</h3>
              <p className="text-sm text-muted-foreground">
                Get a beautiful website to showcase your PG
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={websiteData.website_enabled}
              onChange={(e) => onWebsiteChange("website_enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            <span className="ml-3 text-sm font-medium">
              {websiteData.website_enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {websiteData.website_enabled && websiteData.website_slug && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <Label className="text-primary">Your Website URL</Label>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 px-3 py-2 bg-card rounded border text-sm">
                {typeof window !== "undefined" ? window.location.origin : ""}/pg/{websiteData.website_slug}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyWebsiteUrl}>
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Link href={`/pg/${websiteData.website_slug}`} target="_blank">
                <Button type="button" variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
