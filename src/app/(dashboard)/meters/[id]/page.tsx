/**
 * Meter Detail Page
 *
 * Shows meter details, current assignment, assignment history,
 * and recent meter readings.
 */

"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, METER_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageLoading } from "@/components/ui/loading"
import { PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { Select } from "@/components/ui/form-components"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Gauge,
  Zap,
  Droplets,
  Building2,
  Home,
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
  Plus,
  History,
  FileText,
  XCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import {
  MeterType,
  MeterStatus,
  MeterWithRelations,
  MeterAssignmentWithRelations,
  MeterDetailReading,
  MeterDetailRoom,
  METER_TYPE_CONFIG,
  METER_STATUS_CONFIG,
  ASSIGNMENT_REASONS,
  AssignmentReason,
} from "@/types/meters.types"

// ============================================
// Icon mapping
// ============================================

const meterTypeIcons: Record<MeterType, typeof Zap> = {
  electricity: Zap,
  water: Droplets,
  gas: Gauge,
}

// ============================================
// Component
// ============================================

export default function MeterDetailPage() {
  const params = useParams()

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showEndAssignDialog, setShowEndAssignDialog] = useState(false)

  // Form state
  const [newStatus, setNewStatus] = useState<MeterStatus>("faulty")
  const [assignForm, setAssignForm] = useState({
    room_id: "",
    start_date: new Date().toISOString().split("T")[0],
    start_reading: "0",
    reason: "initial" as AssignmentReason,
    notes: "",
  })
  const [endForm, setEndForm] = useState({
    end_date: new Date().toISOString().split("T")[0],
    end_reading: "",
    new_status: "" as MeterStatus | "",
  })

  const [saving, setSaving] = useState(false)

  const {
    data: meter,
    related,
    loading,
    deleteRecord,
    updateField,
    isDeleting,
    refetch,
  } = useDetailPage<MeterWithRelations>({
    config: METER_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Get related data
  const assignments = (related.assignments || []) as MeterAssignmentWithRelations[]
  const readings = (related.readings || []) as MeterDetailReading[]
  const rooms = (related.rooms || []) as MeterDetailRoom[]

  // Get current assignment (no end_date)
  const currentAssignment = assignments.find((a) => !a.end_date)

  const handleDelete = async () => {
    await deleteRecord({ confirm: false })
  }

  const handleStatusChange = async () => {
    if (!meter) return
    setSaving(true)

    const success = await updateField("status", newStatus)
    if (success) {
      setShowStatusDialog(false)
      toast.success(`Meter marked as ${METER_STATUS_CONFIG[newStatus].label}`)
    }
    setSaving(false)
  }

  const handleAssign = async () => {
    if (!meter || !assignForm.room_id) {
      toast.error("Please select a room")
      return
    }
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("meter_assignments").insert({
      owner_id: user?.id,
      meter_id: meter.id,
      room_id: assignForm.room_id,
      start_date: assignForm.start_date,
      start_reading: parseFloat(assignForm.start_reading) || 0,
      reason: assignForm.reason,
      notes: assignForm.notes || null,
    })

    if (error) {
      toast.error("Failed to assign meter")
      console.error(error)
      setSaving(false)
      return
    }

    toast.success("Meter assigned to room")
    setShowAssignDialog(false)
    refetch()
    setSaving(false)
  }

  const handleEndAssignment = async () => {
    if (!currentAssignment || !endForm.end_reading) {
      toast.error("Please enter the final reading")
      return
    }
    setSaving(true)

    const supabase = createClient()

    // End the assignment
    const { error: assignError } = await supabase
      .from("meter_assignments")
      .update({
        end_date: endForm.end_date,
        end_reading: parseFloat(endForm.end_reading),
      })
      .eq("id", currentAssignment.id)

    if (assignError) {
      toast.error("Failed to end assignment")
      setSaving(false)
      return
    }

    // Update meter status if specified
    if (endForm.new_status && meter) {
      await supabase
        .from("meters")
        .update({ status: endForm.new_status, updated_at: new Date().toISOString() })
        .eq("id", meter.id)
    }

    toast.success("Assignment ended")
    setShowEndAssignDialog(false)
    refetch()
    setSaving(false)
  }

  if (loading) {
    return <PageLoading message="Loading meter details..." />
  }

  if (!meter) {
    return null
  }

  const typeConfig = METER_TYPE_CONFIG[meter.meter_type] || METER_TYPE_CONFIG.electricity
  const statusConfig = METER_STATUS_CONFIG[meter.status] || METER_STATUS_CONFIG.active
  const TypeIcon = meterTypeIcons[meter.meter_type] || Gauge

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={meter.meter_number}
        subtitle={typeConfig.label}
        backHref="/meters"
        backLabel="All Meters"
        avatar={
          <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
            <TypeIcon className={`h-8 w-8 ${typeConfig.color}`} />
          </div>
        }
        status={<StatusBadge variant={statusConfig.variant} label={statusConfig.label} />}
        actions={
          <div className="flex items-center gap-2">
            {meter.status === "active" && !currentAssignment && (
              <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign to Room
              </Button>
            )}
            {currentAssignment && (
              <Button variant="outline" size="sm" onClick={() => setShowEndAssignDialog(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                End Assignment
              </Button>
            )}
            <PermissionGate permission="meters.edit" hide>
              <Link href={`/meters/${meter.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            {meter.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus("faulty")
                  setShowStatusDialog(true)
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Mark Faulty
              </Button>
            )}
            <PermissionGate permission="meters.delete" hide>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Initial Reading"
          value={meter.initial_reading.toLocaleString()}
          icon={Gauge}
        />
        <InfoCard
          label="Property"
          value={meter.property?.name || "—"}
          icon={Building2}
        />
        <InfoCard
          label="Current Room"
          value={currentAssignment?.room?.room_number ? `Room ${currentAssignment.room.room_number}` : "Not Assigned"}
          icon={Home}
          variant={currentAssignment ? "default" : "muted"}
        />
        <InfoCard
          label="Readings"
          value={readings.length.toString()}
          icon={FileText}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Meter Details */}
        <DetailSection
          title="Meter Details"
          description="Physical meter information"
          icon={Gauge}
        >
          <InfoRow label="Meter Number" value={meter.meter_number} icon={Gauge} />
          <InfoRow label="Type" value={typeConfig.label} icon={TypeIcon} />
          <InfoRow
            label="Property"
            value={
              meter.property ? (
                <PropertyLink id={meter.property.id} name={meter.property.name} />
              ) : (
                "—"
              )
            }
            icon={Building2}
          />
          <InfoRow label="Make" value={meter.make || "—"} />
          <InfoRow label="Model" value={meter.model || "—"} />
          <InfoRow
            label="Installation Date"
            value={meter.installation_date ? formatDate(meter.installation_date) : "—"}
            icon={Calendar}
          />
          <InfoRow
            label="Status"
            value={<StatusBadge variant={statusConfig.variant} label={statusConfig.label} />}
          />
        </DetailSection>

        {/* Current Assignment */}
        <DetailSection
          title="Current Assignment"
          description={currentAssignment ? "Currently assigned to" : "Not currently assigned"}
          icon={Home}
          actions={
            currentAssignment ? (
              <Button variant="outline" size="sm" onClick={() => setShowEndAssignDialog(true)}>
                End Assignment
              </Button>
            ) : meter.status === "active" ? (
              <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign
              </Button>
            ) : null
          }
        >
          {currentAssignment ? (
            <>
              <InfoRow
                label="Room"
                value={
                  currentAssignment.room ? (
                    <RoomLink
                      id={currentAssignment.room.id}
                      roomNumber={currentAssignment.room.room_number}
                    />
                  ) : (
                    "—"
                  )
                }
                icon={Home}
              />
              <InfoRow
                label="Assigned Since"
                value={formatDate(currentAssignment.start_date)}
                icon={Calendar}
              />
              <InfoRow
                label="Start Reading"
                value={currentAssignment.start_reading.toLocaleString()}
                icon={Gauge}
              />
              {currentAssignment.reason && (
                <InfoRow
                  label="Reason"
                  value={ASSIGNMENT_REASONS.find((r) => r.value === currentAssignment.reason)?.label || currentAssignment.reason}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              This meter is not currently assigned to any room.
            </p>
          )}
        </DetailSection>
      </div>

      {/* Assignment History */}
      <DetailSection
        title="Assignment History"
        description={`${assignments.length} assignment(s)`}
        icon={History}
      >
        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`p-4 border rounded-lg ${!assignment.end_date ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${!assignment.end_date ? "bg-primary/10" : "bg-muted"}`}>
                      <Home className={`h-4 w-4 ${!assignment.end_date ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="font-medium">
                        {assignment.room ? (
                          <RoomLink id={assignment.room.id} roomNumber={assignment.room.room_number} />
                        ) : (
                          "Unknown Room"
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(assignment.start_date)} — {assignment.end_date ? formatDate(assignment.end_date) : "Present"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Start:</span>{" "}
                      <span className="font-mono">{assignment.start_reading.toLocaleString()}</span>
                    </div>
                    {assignment.end_reading != null && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">End:</span>{" "}
                        <span className="font-mono">{assignment.end_reading.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                {assignment.reason && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Reason: {ASSIGNMENT_REASONS.find((r) => r.value === assignment.reason)?.label || assignment.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No assignment history found.
          </p>
        )}
      </DetailSection>

      {/* Recent Readings */}
      <DetailSection
        title="Recent Readings"
        description={`Last ${readings.length} reading(s)`}
        icon={FileText}
        actions={
          <Link href={`/meter-readings?meter_id=${meter.id}`}>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        }
      >
        {readings.length > 0 ? (
          <div className="space-y-2">
            {readings.map((reading) => (
              <Link key={reading.id} href={`/meter-readings/${reading.id}`}>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(reading.reading_date)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">{reading.reading_value.toLocaleString()}</span>
                    {reading.units_consumed !== null && (
                      <span className="text-sm text-muted-foreground">
                        (+{reading.units_consumed.toLocaleString()} {typeConfig.unit})
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No readings recorded for this meter.
          </p>
        )}
      </DetailSection>

      {/* Notes */}
      {meter.notes && (
        <DetailSection title="Notes" icon={FileText}>
          <p className="text-sm whitespace-pre-wrap">{meter.notes}</p>
        </DetailSection>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Meter"
        description={`Are you sure you want to delete meter ${meter.meter_number}? This action cannot be undone. All assignment history will be deleted.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Meter Status</DialogTitle>
            <DialogDescription>Select the new status for this meter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as MeterStatus)}
                options={[
                  { value: "active", label: "Active" },
                  { value: "faulty", label: "Faulty" },
                  { value: "replaced", label: "Replaced" },
                  { value: "retired", label: "Retired" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Room Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Meter to Room</DialogTitle>
            <DialogDescription>Select a room and enter the initial reading.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select
                value={assignForm.room_id}
                onChange={(e) => setAssignForm({ ...assignForm, room_id: e.target.value })}
                options={[
                  { value: "", label: "Select a room" },
                  ...rooms.map((r) => ({ value: r.id, label: `Room ${r.room_number}` })),
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={assignForm.start_date}
                onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Reading *</Label>
              <Input
                type="number"
                value={assignForm.start_reading}
                onChange={(e) => setAssignForm({ ...assignForm, start_reading: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={assignForm.reason}
                onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value as AssignmentReason })}
                options={ASSIGNMENT_REASONS.map((r) => ({ value: r.value, label: r.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Assignment Dialog */}
      <Dialog open={showEndAssignDialog} onOpenChange={setShowEndAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Meter Assignment</DialogTitle>
            <DialogDescription>Record the final reading and optionally update the meter status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endForm.end_date}
                onChange={(e) => setEndForm({ ...endForm, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Final Reading *</Label>
              <Input
                type="number"
                value={endForm.end_reading}
                onChange={(e) => setEndForm({ ...endForm, end_reading: e.target.value })}
                placeholder="Enter final meter reading"
              />
            </div>
            <div className="space-y-2">
              <Label>Update Meter Status (Optional)</Label>
              <Select
                value={endForm.new_status}
                onChange={(e) => setEndForm({ ...endForm, new_status: e.target.value as MeterStatus | "" })}
                options={[
                  { value: "", label: "Keep current status" },
                  { value: "faulty", label: "Mark as Faulty" },
                  { value: "replaced", label: "Mark as Replaced" },
                  { value: "retired", label: "Mark as Retired" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndAssignment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "End Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
