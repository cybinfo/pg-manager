"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Moon, IndianRupee, Calendar, FileText } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { formatCurrency } from "@/lib/format"

interface OvernightStaySectionProps {
  formData: {
    is_overnight: boolean
    num_nights: string
    charge_per_night: string
    expected_checkout_date: string
    create_bill: boolean
    visitor_type: string
    tenant_id: string
    visitor_name: string
  }
  totalCharge: number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  loading: boolean
}

export function OvernightStaySection({
  formData,
  totalCharge,
  onChange,
  loading,
}: OvernightStaySectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Moon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Overnight Stay</CardTitle>
            <CardDescription>Is this visitor staying overnight?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            id="is_overnight"
            name="is_overnight"
            type="checkbox"
            checked={formData.is_overnight}
            onChange={onChange}
            disabled={loading}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="is_overnight" className="font-normal cursor-pointer">
            This is an overnight stay
          </Label>
        </div>

        {formData.is_overnight && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Number of Nights" htmlFor="num_nights" required>
                <Input
                  id="num_nights"
                  name="num_nights"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.num_nights}
                  onChange={onChange}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Charge per Night" htmlFor="charge_per_night">
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="charge_per_night"
                    name="charge_per_night"
                    type="number"
                    min="0"
                    placeholder="e.g., 200"
                    value={formData.charge_per_night}
                    onChange={onChange}
                    disabled={loading}
                    className="pl-9"
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Expected Checkout Date" htmlFor="expected_checkout_date" hint="Auto-calculated if not specified based on number of nights">
              <DatePicker
                id="expected_checkout_date"
                value={formData.expected_checkout_date}
                onChange={(val) => onChange({ target: { name: "expected_checkout_date", value: val } } as React.ChangeEvent<HTMLInputElement>)}
                disabled={loading}
              />
            </FormField>

            {totalCharge > 0 && formData.visitor_type === "tenant_visitor" && formData.tenant_id && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Total Charge</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency(totalCharge)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {formData.num_nights} night{parseInt(formData.num_nights) > 1 ? "s" : ""} × {formatCurrency(parseFloat(formData.charge_per_night))}/night
                </p>

                <div className="pt-3 border-t border-purple-200">
                  <div className="flex items-center gap-2">
                    <input
                      id="create_bill"
                      name="create_bill"
                      type="checkbox"
                      checked={formData.create_bill}
                      onChange={onChange}
                      disabled={loading}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="create_bill" className="font-normal cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Create bill for tenant
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Bill will be created for the visiting tenant with visitor stay charges
                  </p>
                </div>
              </div>
            )}

            {!formData.charge_per_night && (
              <p className="text-xs text-muted-foreground">
                Leave charge empty if no fee for overnight stays
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
