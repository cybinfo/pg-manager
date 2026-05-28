"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  houseRules: string
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteHouseRulesSection({ houseRules, onWebsiteChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">House Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          className="min-h-[100px] resize-none"
          placeholder="1. No smoking inside premises&#10;2. Visitors allowed till 8 PM&#10;3. Maintain silence after 10 PM"
          value={houseRules}
          onChange={(e) => onWebsiteChange("house_rules", e.target.value)}
        />
      </CardContent>
    </Card>
  )
}
