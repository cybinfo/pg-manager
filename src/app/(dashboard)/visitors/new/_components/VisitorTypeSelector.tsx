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
  tenant_visitor: "bg-blue-100 text-blue-700 border-blue-300",
  enquiry: "bg-purple-100 text-purple-700 border-purple-300",
  service_provider: "bg-orange-100 text-orange-700 border-orange-300",
  general: "bg-slate-100 text-slate-700 border-slate-300",
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
                  : "border-gray-200 hover:border-gray-300"
              } ${selectedContact && selectedContact.visitor_type !== type ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedType === type ? "bg-white/50" : "bg-gray-100"
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
