"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DetailSection } from "@/components/ui"
import {
  ArrowLeft, Gauge, Loader2, Building2, Home, Calculator,
  IndianRupee, Users, Zap, Droplets, Plus, FileText,
} from "lucide-react"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredSelect } from "@/lib/validation"
import type { ValidatorResult } from "@/lib/validation"
import { showWarning } from "@/lib/toast-helpers"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"
import { getTodayISO } from "@/lib/date-helpers"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/auth"
import { logger } from "@/lib/logger"
import { useFeatures } from "@/lib/features/use-features"
import { createMeterReadingWithCharges } from "@/lib/services/meter-charges"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"
import { DatePicker } from "@/components/ui/date-picker"
import { Checkbox } from "@/components/ui/checkbox"

interface ChargeType {
  id: string
  name: string
  calculation_config: { rate_per_unit?: number; split_by?: string } | null
}

interface LastReading {
  reading_value: number
  reading_date: string
}

interface Tenant {
  id: string
  name: string
  room_id: string
}

interface Meter {
  id: string
  meter_number: string
  meter_type: string
  property_id: string
  status: string
  property: { id: string; name: string } | null
  current_assignment: {
    room_id: string
    room_number: string
    start_reading: number
  }
}

const WORKFLOW_STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Meter", icon: Gauge },
  { id: 2, label: "Enter Reading", icon: Calculator },
  { id: 3, label: "Confirm & Save", icon: FileText },
]

function MeterTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "electricity") return <Zap className={className ?? "h-4 w-4 text-warning"} />
  if (type === "water") return <Droplets className={className ?? "h-4 w-4 text-info"} />
  return <Gauge className={className ?? "h-4 w-4 text-warning"} />
}

function meterUnit(type: string) {
  if (type === "electricity") return "kWh"
  if (type === "water") return "L"
  if (type === "gas") return "m³"
  return "units"
}

function NewMeterReadingContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/meter-readings" })
  const { isFeatureEnabled } = useFeatures()
  const [loadingData, setLoadingData] = useState(true)
  const [loadingLastReading, setLoadingLastReading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Data
  const [meters, setMeters] = useState<Meter[]>([])
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [roomTenants, setRoomTenants] = useState<Tenant[]>([])

  // Selected meter and reading info
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null)
  const [lastReading, setLastReading] = useState<LastReading | null>(null)
  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null)
  const [generateCharge, setGenerateCharge] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    ownerId,
    searchParams,
  } = useFormPage({
    table: "meter_readings",
    initialData: {
      meter_id: "",
      reading_date: getTodayISO(),
      reading_value: "",
      notes: "",
    },
    redirectTo: "/meter-readings",
    successMessage: "Meter reading recorded successfully!",
    errorMessage: "Failed to record meter reading",
    validationSchema: {
      meter_id: requiredSelect("Meter"),
      reading_value: (value: unknown): ValidatorResult => {
        const num = parseFloat(String(value ?? ""))
        if (!value || isNaN(num) || num < 0) {
          return { isValid: false, error: "Please enter a valid reading value" }
        }
        return null
      },
    },
    validate: (data) => {
      if (lastReading && data.reading_value) {
        const readingValue = parseFloat(data.reading_value as string)
        if (!isNaN(readingValue) && readingValue < lastReading.reading_value) {
          return "Current reading cannot be less than the previous reading"
        }
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      if (!selectedMeter) {
        throw new Error("Please select a meter")
      }

      const readingValue = parseFloat(data.reading_value as string)

      const meterTypeToCharge: Record<string, string[]> = {
        electricity: ["Electricity", "electricity"],
        water: ["Water", "water"],
        gas: ["Gas", "gas"],
      }
      const matchingChargeType = chargeTypes.find((ct: ChargeType) =>
        meterTypeToCharge[selectedMeter.meter_type]?.includes(ct.name)
      ) || null

      const { chargeWarning, anomaly } = await createMeterReadingWithCharges(supabase, {
        userId,
        meter: selectedMeter,
        readingDate: data.reading_date as string,
        readingValue,
        previousReadingValue: lastReading?.reading_value ?? null,
        unitsConsumed: calculatedUnits,
        notes: (data.notes as string) || null,
        matchingChargeType,
        generateCharge,
        roomTenants,
        consumptionAlertsEnabled: isFeatureEnabled("meters", "consumptionAlerts"),
      })

      if (chargeWarning) {
        logger.error("Charge generation warning on new reading", { detail: chargeWarning })
        showWarning(chargeWarning)
      }

      // Send anomaly alert email (fire-and-forget; service returns the anomaly data)
      if (anomaly?.isAnomaly && matchingChargeType) {
        const { data: ownerProfile } = await supabase
          .from("user_profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single()

        if (ownerProfile?.email) {
          const { sendConsumptionAlert } = await import("@/lib/email")
          sendConsumptionAlert({
            to: ownerProfile.email,
            ownerName: ownerProfile.full_name || "Owner",
            roomNumber: selectedMeter.current_assignment.room_number || selectedMeter.current_assignment.room_id,
            chargeType: matchingChargeType.name,
            currentUnits: anomaly.currentUnits,
            averageUnits: anomaly.averageUnits,
            alertType: anomaly.alertType!,
          }).catch(() => {})
        }
      }

      // Redirect back to room's meter readings if we came from there
      const roomIdFromUrl = searchParams.get("room")
      if (roomIdFromUrl) {
        return `/rooms/${roomIdFromUrl}/meter-readings`
      }
    },
  })

  const roomIdFromUrl = searchParams.get("room")

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [chargeTypesRes, tenantsRes, metersRes] = await Promise.all([
        supabase.from("charge_types").select("id, name, calculation_config").eq("owner_id", ownerId).in("name", ["Electricity", "Water", "Gas", "electricity", "water", "gas"]).order("name"),
        supabase.from("tenants").select("id, name, room_id").eq("status", "active"),
        supabase.from("meters").select(`
          id, meter_number, meter_type, property_id, status,
          property:properties(id, name)
        `).eq("status", "active").order("meter_number"),
      ])

      if (!chargeTypesRes.error && chargeTypesRes.data) {
        setChargeTypes(chargeTypesRes.data)
      }

      if (!tenantsRes.error) {
        setTenants(tenantsRes.data || [])
      }

      // Fetch meters with their current assignments
      if (!metersRes.error && metersRes.data) {
        const metersWithAssignments = await Promise.all(
          metersRes.data.map(async (meter: Record<string, unknown>) => {
            const { data: assignment } = await supabase
              .from("meter_assignments")
              .select("room_id, start_reading, room:rooms(room_number)")
              .eq("meter_id", meter.id)
              .is("end_date", null)
              .single()

            if (!assignment) return null

            return {
              ...meter,
              property: transformJoin(meter.property),
              current_assignment: {
                room_id: assignment.room_id,
                room_number: transformJoin(assignment.room)?.room_number ?? null,
                start_reading: assignment.start_reading,
              },
            } as Meter
          })
        )

        // Filter to only meters with active assignments
        const assignedMeters = metersWithAssignments.filter((m): m is Meter => m !== null)
        setMeters(assignedMeters)

        // Auto-select meter if room parameter is provided
        if (roomIdFromUrl) {
          const meterForRoom = assignedMeters.find(m => m.current_assignment.room_id === roomIdFromUrl)
          if (meterForRoom) {
            setSelectedMeter(meterForRoom)
            setFormData(prev => ({ ...prev, meter_id: meterForRoom.id }))
            setCurrentStep(2)
          }
        }
      }

      setLoadingData(false)
    }

    if (ownerId) {
      fetchData()
    }
  }, [roomIdFromUrl, ownerId, setFormData])

  // Filter tenants when meter changes (based on room)
  useEffect(() => {
    if (selectedMeter?.current_assignment?.room_id) {
      const filtered = tenants.filter((t) => t.room_id === selectedMeter.current_assignment.room_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoomTenants(filtered)
    } else {
      setRoomTenants([])
    }
  }, [selectedMeter, tenants])

  // Fetch last reading when meter changes
  useEffect(() => {
    const fetchLastReading = async () => {
      if (!selectedMeter) {
        setLastReading(null)
        return
      }

      setLoadingLastReading(true)
      const supabase = createClient()

      // Get the last reading for this specific meter
      const { data: meterReading } = await supabase
        .from("meter_readings")
        .select("reading_value, reading_date")
        .eq("meter_id", selectedMeter.id)
        .order("reading_date", { ascending: false })
        .limit(1)
        .single()

      if (meterReading) {
        setLastReading(meterReading)
      } else {
        // No readings yet - use the assignment's start_reading
        setLastReading({
          reading_value: selectedMeter.current_assignment.start_reading,
          reading_date: "Assignment Start",
        })
      }
      setLoadingLastReading(false)
    }

    fetchLastReading()
  }, [selectedMeter])

  // Calculate units consumed
  useEffect(() => {
    if (lastReading && formData.reading_value) {
      const currentValue = parseFloat(formData.reading_value as string)
      if (!isNaN(currentValue) && currentValue >= lastReading.reading_value) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCalculatedUnits(currentValue - lastReading.reading_value)
      } else {
        setCalculatedUnits(null)
      }
    } else {
      setCalculatedUnits(null)
    }
  }, [formData.reading_value, lastReading])

  // Handle meter selection
  const handleMeterSelect = (meterId: string) => {
    const meter = meters.find(m => m.id === meterId)
    if (meter) {
      setSelectedMeter(meter)
      setFormData(prev => ({ ...prev, meter_id: meter.id }))
    } else {
      setSelectedMeter(null)
      setFormData(prev => ({ ...prev, meter_id: "" }))
    }
  }

  // Get selected charge type for display
  const selectedChargeType = selectedMeter ? chargeTypes.find((ct: ChargeType) => {
    const meterTypeToCharge: Record<string, string[]> = {
      electricity: ["Electricity", "electricity"],
      water: ["Water", "water"],
      gas: ["Gas", "gas"],
    }
    return meterTypeToCharge[selectedMeter.meter_type]?.includes(ct.name)
  }) : null

  // Step completion rules
  const step1Complete = !!selectedMeter
  const step2Complete = !!(formData.reading_date && formData.reading_value)

  // Callable submit (not bound to FormEvent)
  const doSubmit = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)
  }

  // Charge preview values
  const chargeTotal = calculatedUnits !== null && selectedChargeType?.calculation_config?.rate_per_unit
    ? calculatedUnits * selectedChargeType.calculation_config.rate_per_unit
    : null
  const chargePerPerson = chargeTotal !== null && roomTenants.length > 1 && selectedChargeType?.calculation_config?.split_by === "occupants"
    ? chargeTotal / roomTenants.length
    : null

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  // No assigned meters - show empty state
  if (meters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Record Meter Reading</h1>
            <p className="text-muted-foreground">Enter a new meter reading</p>
          </div>
        </div>

        <DetailSection title="No Meters Assigned" icon={Gauge}>
          <div className="flex flex-col items-center justify-center py-8">
            <Gauge className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No meters assigned to rooms</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create meters and assign them to rooms before recording readings.
            </p>
            <Link href="/meters/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Meter
              </Button>
            </Link>
          </div>
        </DetailSection>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WorkflowHeader
        title="Record Meter Reading"
        subtitle="Select a meter and enter the current reading"
        icon={Gauge}
        onBack={() => window.history.back()}
        backLabel="Meter Readings"
      />

      <WorkflowStepper steps={WORKFLOW_STEPS} currentStep={currentStep} />

      {/* Step 1: Select Meter */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Meter"
        description="Choose the meter to record a reading for"
        icon={Gauge}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(1)}
        completedSummary={
          selectedMeter
            ? `${selectedMeter.meter_number} · ${selectedMeter.property?.name} / Room ${selectedMeter.current_assignment.room_number}`
            : undefined
        }
      >
        <div className="space-y-4">
          <FormField label="Meter" required error={errors.meter_id}>
            <Select
              id="meter_id"
              value={formData.meter_id as string}
              onChange={(e) => handleMeterSelect(e.target.value)}
              required
              disabled={saving}
              placeholder="Select a meter"
              options={meters.map((meter) => ({
                value: meter.id,
                label: `${meter.meter_number} (${meter.meter_type}) - ${meter.property?.name} / Room ${meter.current_assignment.room_number}`,
              }))}
            />
          </FormField>

          {/* Meter info card */}
          {selectedMeter && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MeterTypeIcon type={selectedMeter.meter_type} />
                <span className="font-medium">{selectedMeter.meter_number}</span>
                <span className="text-sm text-muted-foreground capitalize">({selectedMeter.meter_type})</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium capitalize">
                  {selectedMeter.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {selectedMeter.property?.name}
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Room {selectedMeter.current_assignment.room_number}
                </div>
                {lastReading && (
                  <div className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Last reading: {formatNumber(lastReading.reading_value)}{" "}
                    {lastReading.reading_date === "Assignment Start"
                      ? "(assignment start)"
                      : `on ${formatDate(lastReading.reading_date)}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {step1Complete && (
            <Button
              className="w-full"
              onClick={() => setCurrentStep(2)}
            >
              Continue
            </Button>
          )}
        </div>
      </WorkflowStepCard>

      {/* Step 2: Enter Reading */}
      <WorkflowStepCard
        stepNum={2}
        title="Enter Reading"
        description="Record the reading date and current meter value"
        icon={Calculator}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          step2Complete
            ? `${formatDate(formData.reading_date as string)} · Reading: ${formatNumber(parseFloat(formData.reading_value as string))}${calculatedUnits !== null ? ` · ${formatNumber(calculatedUnits)} ${selectedMeter ? meterUnit(selectedMeter.meter_type) : "units"}` : ""}`
            : undefined
        }
      >
        <div className="space-y-4">
          <FormField label="Reading Date" required>
            <DatePicker
              id="reading_date"
              value={formData.reading_date as string}
              onChange={(val) => setFormData((prev) => ({ ...prev, reading_date: val }))}
              disabled={saving}
            />
          </FormField>

          {/* Previous reading — readonly context */}
          {loadingLastReading ? (
            <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading previous reading...</span>
            </div>
          ) : lastReading ? (
            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-info">
                <strong>Previous Reading:</strong> {formatNumber(lastReading.reading_value)}
                {lastReading.reading_date === "Assignment Start"
                  ? " (Assignment Start)"
                  : ` on ${formatDate(lastReading.reading_date)}`}
              </p>
            </div>
          ) : null}

          <FormField
            label="Current Reading"
            required
            error={errors.reading_value}
            tooltip="Enter the number shown on the meter dial right now. Units consumed = current reading minus previous reading."
          >
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reading_value"
                name="reading_value"
                type="number"
                min={lastReading?.reading_value || 0}
                step="0.01"
                placeholder="e.g., 12345"
                value={formData.reading_value as string}
                onChange={handleChange}
                required
                disabled={saving}
                className="pl-9"
              />
            </div>
          </FormField>

          {/* Units consumed preview */}
          {calculatedUnits !== null && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Calculator className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-success">Units Consumed</p>
                  <p className="text-2xl font-bold text-success">
                    {formatNumber(calculatedUnits)} {selectedMeter ? meterUnit(selectedMeter.meter_type) : "units"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charge preview */}
          {calculatedUnits !== null && calculatedUnits > 0 && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="generateCharge"
                  checked={generateCharge}
                  onCheckedChange={(checked) => setGenerateCharge(checked === true)}
                  disabled={saving}
                />
                <Label htmlFor="generateCharge" className="font-medium cursor-pointer">
                  Generate charges for tenants automatically
                </Label>
              </div>

              {generateCharge && (
                <div className="p-4 bg-info/10 border border-info/20 rounded-lg space-y-3">
                  {roomTenants.length === 0 ? (
                    <div className="flex items-center gap-2 text-warning">
                      <Users className="h-4 w-4" />
                      <p className="text-sm">No active tenants in this room. Charges will not be generated.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-info">
                        <Users className="h-4 w-4" />
                        <p className="text-sm font-medium">
                          {roomTenants.length} tenant{roomTenants.length > 1 ? "s" : ""} in this room
                        </p>
                      </div>
                      <div className="text-sm text-info/80">
                        {roomTenants.map((t, i) => (
                          <span key={t.id}>
                            {t.name}{i < roomTenants.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>

                      {selectedChargeType?.calculation_config?.rate_per_unit ? (
                        <div className="pt-2 border-t border-info/20">
                          <div className="flex items-center gap-2 text-info">
                            <IndianRupee className="h-4 w-4" />
                            <div className="text-sm">
                              <p>
                                <span className="font-medium">Rate:</span> {formatCurrency(selectedChargeType.calculation_config.rate_per_unit)}/unit
                              </p>
                              <p>
                                <span className="font-medium">Total Amount:</span> {chargeTotal !== null ? formatCurrency(chargeTotal) : "—"}
                              </p>
                              {chargePerPerson !== null && (
                                <p>
                                  <span className="font-medium">Per Person:</span> {formatCurrency(chargePerPerson)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-warning pt-2 border-t border-info/20">
                          <IndianRupee className="h-4 w-4" />
                          <p className="text-sm">No rate configured for {selectedMeter?.meter_type}. Please update charge type settings.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {step2Complete && (
            <Button
              className="w-full"
              onClick={() => setCurrentStep(3)}
            >
              Continue
            </Button>
          )}
        </div>
      </WorkflowStepCard>

      {/* Step 3: Confirm & Save */}
      <WorkflowStepCard
        stepNum={3}
        title="Confirm & Save"
        description="Review the reading details and save"
        icon={FileText}
        currentStep={currentStep}
      >
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-lg border divide-y text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Meter</span>
              <span className="font-medium">{selectedMeter?.meter_number} ({selectedMeter?.meter_type})</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Property / Room</span>
              <span className="font-medium">{selectedMeter?.property?.name} / Room {selectedMeter?.current_assignment.room_number}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Reading Date</span>
              <span className="font-medium">{formData.reading_date ? formatDate(formData.reading_date as string) : "—"}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Previous Reading</span>
              <span className="font-medium">{lastReading ? formatNumber(lastReading.reading_value) : "—"}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Current Reading</span>
              <span className="font-medium">{formData.reading_value ? formatNumber(parseFloat(formData.reading_value as string)) : "—"}</span>
            </div>
            {calculatedUnits !== null && (
              <div className="flex justify-between px-4 py-2.5 bg-success/5">
                <span className="text-muted-foreground">Units Consumed</span>
                <span className="font-semibold text-success">
                  {formatNumber(calculatedUnits)} {selectedMeter ? meterUnit(selectedMeter.meter_type) : "units"}
                </span>
              </div>
            )}
            {chargeTotal !== null && generateCharge && (
              <div className="flex justify-between px-4 py-2.5 bg-info/5">
                <span className="text-muted-foreground">Charge</span>
                <span className="font-semibold text-info">{formatCurrency(chargeTotal)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <FormField label="Notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes..."
              value={formData.notes as string}
              onChange={handleChange}
              disabled={saving}
              className="min-h-[80px]"
            />
          </FormField>

          {/* Submit */}
          <div className="flex gap-3">
            <Link href="/meter-readings" className="flex-1">
              <Button type="button" variant="outline" disabled={saving} className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={doSubmit}
              disabled={saving || !formData.meter_id || !step2Complete}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Gauge className="mr-2 h-4 w-4" />
                  Save Reading
                </>
              )}
            </Button>
          </div>
        </div>
      </WorkflowStepCard>
    </div>
  )
}

export default function NewMeterReadingPage() {
  return (
    <PermissionGuard permission="meter_readings.create">
      <NewMeterReadingContent />
    </PermissionGuard>
  )
}
