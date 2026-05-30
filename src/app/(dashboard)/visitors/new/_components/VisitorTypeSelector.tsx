"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import {
  VisitorType,
  VisitorContactSearchResult,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPE_DESCRIPTIONS,
} from "@/types/visitors.types"
import { VISITOR_TYPE_ICONS } from "@/lib/status"

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(VISITOR_TYPE_LABELS) as VisitorType[]).map((type) => {
            const Icon = VISITOR_TYPE_ICONS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                disabled={!!selectedContact && selectedContact.visitor_type !== type}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedType === type
                    ? "bg-primary/10 border-primary"
                    : "border-border hover:border-primary/40"
                } ${selectedContact && selectedContact.visitor_type !== type ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedType === type ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Icon className={`h-5 w-5 ${selectedType === type ? "text-primary" : ""}`} />
                  </div>
                  <div>
                    <div className="font-medium">{VISITOR_TYPE_LABELS[type]}</div>
                    <div className="text-xs opacity-75">{VISITOR_TYPE_DESCRIPTIONS[type]}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
