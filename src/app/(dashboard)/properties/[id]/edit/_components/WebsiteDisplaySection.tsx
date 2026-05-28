"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WebsiteConfig, OnWebsiteChange } from "./WebsiteTypes"

const DISPLAY_OPTIONS = [
  { key: "show_rooms", label: "Show Rooms Section", desc: "Display available rooms on website" },
  { key: "show_pricing", label: "Show Pricing", desc: "Display room prices publicly" },
  { key: "show_contact_form", label: "Show Contact Form", desc: "Allow inquiries via form" },
] as const

interface Props {
  config: WebsiteConfig
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteDisplaySection({ config, onWebsiteChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Display Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DISPLAY_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="text-sm text-muted-foreground">{option.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config[option.key] as boolean}
                onChange={(e) => onWebsiteChange(option.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
