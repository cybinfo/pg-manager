"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Star, X, Loader2 } from "lucide-react"
import { PersonSelector } from "@/components/people"
import { PersonSearchResult } from "@/types/people.types"
import { VisitorContactSearchResult, VisitorType } from "@/types/visitors.types"

const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  enquiry: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  service_provider: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
  general: "bg-muted text-foreground border-border",
}

interface PersonStepCardProps {
  ownerId: string
  selectedPerson: PersonSearchResult | null
  selectedContact: VisitorContactSearchResult | null
  loading: boolean
  onPersonSelect: (person: PersonSearchResult | null) => void
  onClearContact: () => void
}

export function PersonStepCard({
  ownerId,
  selectedPerson,
  selectedContact,
  loading,
  onPersonSelect,
  onClearContact,
}: PersonStepCardProps) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Step 1: Select Visitor</CardTitle>
            <CardDescription>
              Search for an existing person or add a new visitor
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ownerId ? (
          <PersonSelector
            ownerId={ownerId}
            selectedPersonId={selectedPerson?.id}
            onSelect={onPersonSelect}
            excludeTags={["blocked"]}
            placeholder="Search by name, phone, or email..."
            disabled={loading}
            showEditLink={true}
            showDetailedInfo={true}
          />
        ) : (
          <div className="h-10 flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </div>
        )}

        {/* Legacy contact display (if selected via old method) */}
        {selectedContact && !selectedPerson && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${VISITOR_TYPE_COLORS[selectedContact.visitor_type]}`}>
                <span />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedContact.name}</span>
                  {selectedContact.is_frequent && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedContact.phone && <span>{selectedContact.phone}</span>}
                  {selectedContact.company_name && <span> - {selectedContact.company_name}</span>}
                  <span className="ml-2">({selectedContact.visit_count} visits)</span>
                </div>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClearContact}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
