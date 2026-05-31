"use client"

import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Calendar } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { FormField, Select } from "@/components/ui/form-components"
import { EnquirySource, ENQUIRY_SOURCE_LABELS } from "@/types/visitors.types"

interface Room {
  id: string
  room_number: string
  entity_id: string
}

interface EnquiryFieldsProps {
  formData: { enquiry_source: EnquirySource | ""; follow_up_date: string; rooms_interested: string[]; expected_move_in: string }
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onRoomsInterestedChange: (roomId: string) => void
  filteredRooms: Room[]
  loading: boolean
}

export function EnquiryFields({ formData, onChange, onRoomsInterestedChange, filteredRooms, loading }: EnquiryFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle>Enquiry Details</CardTitle>
            <CardDescription>Information about the prospective tenant</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="How did they find you?" htmlFor="enquiry_source">
            <Select
              id="enquiry_source"
              name="enquiry_source"
              value={formData.enquiry_source}
              onChange={onChange}
              disabled={loading}
              placeholder="Select source"
              options={(Object.keys(ENQUIRY_SOURCE_LABELS) as EnquirySource[]).map((source) => ({
                value: source,
                label: ENQUIRY_SOURCE_LABELS[source],
              }))}
            />
          </FormField>
          <div className="space-y-2">
            <Label htmlFor="expected_move_in">
              <Calendar className="h-4 w-4 inline mr-1" />
              Expected Move-in
            </Label>
            <DatePicker
              id="expected_move_in"
              value={formData.expected_move_in}
              onChange={(val) => onChange({ target: { name: "expected_move_in", value: val } } as React.ChangeEvent<HTMLInputElement>)}
              disabled={loading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="follow_up_date">
            <Calendar className="h-4 w-4 inline mr-1" />
            Follow-up Date
          </Label>
          <DatePicker
            id="follow_up_date"
            value={formData.follow_up_date}
            onChange={(val) => onChange({ target: { name: "follow_up_date", value: val } } as React.ChangeEvent<HTMLInputElement>)}
            disabled={loading}
          />
        </div>

        {filteredRooms.length > 0 && (
          <div className="space-y-2">
            <Label>Rooms Interested In</Label>
            <div className="flex flex-wrap gap-2">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onRoomsInterestedChange(room.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    formData.rooms_interested.includes(room.id)
                      ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                      : "bg-muted text-foreground border-border hover:border-border"
                  }`}
                >
                  Room {room.room_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
