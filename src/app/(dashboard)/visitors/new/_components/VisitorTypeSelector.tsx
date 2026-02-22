"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, Wrench, User } from "lucide-react"
import {
  VisitorType,
  VisitorContactSearchResult,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPE_DESCRIPTIONS,
} from "@/types/visitors.types"

const VISITOR_TYPE_ICONS: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <Users className="h-5 w-5" />,
  enquiry: <Search className="h-5 w-5" />,
  service_provider: <Wrench className="h-5 w-5" />,
  general: <User className="h-5 w-5" />,
}

const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-info/10 text-info border-info/20",
  enquiry: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  service_provider: "bg-warning/10 text-warning border-warning/20",
  general: "bg-muted text-foreground border-border",
}

interface VisitorTypeSelectorProps {
  selectedType: VisitorType
  onTypeChange: (type: VisitorType) => void
  selectedContact: VisitorContactSearchResult | null
}

export function VisitorTypeSelector({
  selectedType,
  onTypeChange,
  selectedContact,
}: VisitorTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Visitor Type</CardTitle>
            <CardDescription>Select the type of visitor</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(VISITOR_TYPE_LABELS) as VisitorType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
              disabled={!!selectedContact && selectedContact.visitor_type !== type}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === type
                  ? VISITOR_TYPE_COLORS[type] + " border-current"
                  : "border-border hover:border-border"
              } ${selectedContact && selectedContact.visitor_type !== type ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedType === type ? "bg-card/50" : "bg-muted"
                }`}>
                  {VISITOR_TYPE_ICONS[type]}
                </div>
                <div>
                  <div className="font-medium">{VISITOR_TYPE_LABELS[type]}</div>
                  <div className="text-xs opacity-75">{VISITOR_TYPE_DESCRIPTIONS[type]}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
