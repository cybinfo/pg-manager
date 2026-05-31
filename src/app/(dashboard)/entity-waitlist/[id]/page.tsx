/**
 * Waitlist Entry Detail Page
 *
 * View and manage a waitlist entry. Update status, add notes, convert to member.
 */

"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate } from "@/components/auth"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  Phone,
  Mail,
  Clock,
  Calendar,
  BookOpen,
  UserPlus,
  MessageSquare,
  Loader2,
  X,
  Check,
  Hash,
  Trash2,
  Edit,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { formatDate, formatDateTime } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { handleClientError } from "@/lib/error-handler"
import { LIBRARY_WAITLIST_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryWaitlist, LibraryWaitlistStatus } from "@/types/library.types"
import type { DetailPageConfig } from "@/lib/hooks/useDetailPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { TableBadge } from "@/components/ui/data-table"

// Detail page configuration
const LIBRARY_WAITLIST_DETAIL_CONFIG: DetailPageConfig<LibraryWaitlist> = {
  table: "entity_waitlist",
  select: `
    *,
    library:libraries(id, name),
    converted_member:entity_members(id, name, member_code),
    person:people(id, photo_url)
  `,
  joinFields: ["library", "converted_member", "person"],
}

export default function WaitlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [updating, setUpdating] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [contactNotes, setContactNotes] = useState("")

  const {
    data: entry,
    loading,
    refetch,
  } = useDetailPage<LibraryWaitlist>({
    config: LIBRARY_WAITLIST_DETAIL_CONFIG,
    id,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/entity-waitlist", defaultLabel: "All Waitlist" })

  const updateStatus = async (newStatus: LibraryWaitlistStatus) => {
    if (!entry) return

    setUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("entity_waitlist")
        .update({
          status: newStatus,
          updated_at: getNowISO(),
        })
        .eq("id", entry.id)

      if (error) {
        showError(`Failed to update status: ${error.message}`)
        return
      }

      showSuccess(`Status updated to ${LIBRARY_WAITLIST_STATUS_CONFIG[newStatus].label}`)
      refetch()
    } catch (err) {
      handleClientError(err, "Updating waitlist status")
    } finally {
      setUpdating(false)
    }
  }

  const handleContact = async () => {
    if (!entry) return

    setUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("entity_waitlist")
        .update({
          status: "contacted",
          last_contacted_at: getNowISO(),
          contact_notes: contactNotes.trim() || null,
          updated_at: getNowISO(),
        })
        .eq("id", entry.id)

      if (error) {
        showError(`Failed to update: ${error.message}`)
        return
      }

      showSuccess("Marked as contacted")
      setContactDialogOpen(false)
      setContactNotes("")
      refetch()
    } catch (err) {
      handleClientError(err, "Updating waitlist notes")
    } finally {
      setUpdating(false)
    }
  }

  const handleConvert = () => {
    if (!entry) return
    // Navigate to new member page with pre-filled data
    const params = new URLSearchParams({
      name: entry.name,
      phone: entry.phone,
      ...(entry.email && { email: entry.email }),
      ...(entry.preferred_slot && { slot: entry.preferred_slot }),
      library: entry.entity_id,
      waitlist_id: entry.id,
    })
    router.push(`/entity-members/new?${params.toString()}`)
  }

  if (loading) {
    return <PageLoading message="Loading waitlist entry..." />
  }

  if (!entry) {
    return <NotFoundState title="Waitlist entry not found" backHref="/entity-waitlist" backLabel="All Waitlist" />
  }

  const statusConfig = LIBRARY_WAITLIST_STATUS_CONFIG[entry.status]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={entry.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {entry.position && entry.status === "waiting" && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                #{entry.position} in queue
              </span>
            )}
            {entry.library?.name && (
              <Link href={`/library/${entry.library.id}`} className="hover:text-primary hover:underline">
                {entry.library.name}
              </Link>
            )}
            {entry.preferred_slot && (
              <TableBadge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {entry.preferred_slot}
              </TableBadge>
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Library Waitlist", href: "/entity-waitlist" },
          { label: entry.name || "Waitlist Entry" },
        ]}
        status={statusConfig?.variant || "muted"}
        avatar={
          <div className={`p-3 rounded-xl ${
            entry.status === "waiting" ? "bg-warning/10" :
            entry.status === "contacted" ? "bg-info/10" :
            entry.status === "converted" ? "bg-success/10" : "bg-muted"
          }`}>
            <Users className={`h-8 w-8 ${
              entry.status === "waiting" ? "text-warning" :
              entry.status === "contacted" ? "text-info" :
              entry.status === "converted" ? "text-success" : "text-muted-foreground"
            }`} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {entry.phone && (
              <a href={`tel:${entry.phone}`}>
                <Button variant="outline" size="icon" title="Call">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
            {entry.phone && (
              <a
                href={`https://wa.me/91${entry.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="icon" title="WhatsApp" className="text-success border-success/20 hover:bg-success/10">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </a>
            )}
            {entry.email && (
              <a href={`mailto:${entry.email}`}>
                <Button variant="outline" size="icon" title="Email">
                  <Mail className="h-4 w-4" />
                </Button>
              </a>
            )}
            {entry.status === "waiting" && (
              <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={updating}>
                    <Phone className="mr-2 h-4 w-4" />
                    Mark Contacted
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mark as Contacted</DialogTitle>
                    <DialogDescription>
                      Record that you&apos;ve contacted {entry.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      placeholder="Add notes about the conversation (optional)..."
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleContact} disabled={updating}>
                      {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Mark Contacted
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {(entry.status === "waiting" || entry.status === "contacted") && (
              <>
                <Button size="sm" onClick={handleConvert} disabled={updating}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Convert to Member
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updating}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Waitlist Entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark {entry.name} as cancelled and remove them from the queue.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateStatus("cancelled")}>
                        Cancel Entry
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <PermissionGate permission="entity_waitlist.edit" hide>
              <Link href={`/entity-waitlist/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="entity_waitlist.edit" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (!user?.id) return
                  confirm({
                    title: "Delete Waitlist Entry",
                    description: "Are you sure you want to delete this waitlist entry? This action cannot be undone.",
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        const result = await softDelete("entity_waitlist", id, user.id)
                        if (!result.error) {
                          showSuccess("Waitlist entry deleted successfully")
                          router.push("/entity-waitlist")
                        } else {
                          showError(result.error.message || "Failed to delete waitlist entry")
                        }
                      } catch {
                        showError("Failed to delete waitlist entry")
                      }
                    },
                  })
                }}
              >
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
          label="Status"
          value={statusConfig?.label || entry.status}
          icon={Users}
          variant={statusConfig?.variant || "default"}
        />
        <InfoCard
          label="Queue Position"
          value={entry.status === "waiting" && entry.position ? `#${entry.position}` : "—"}
          icon={Hash}
          variant="default"
        />
        <InfoCard
          label="Joined Waitlist"
          value={formatDate(entry.created_at)}
          icon={Calendar}
          variant="default"
        />
        <InfoCard
          label="Last Contacted"
          value={entry.last_contacted_at ? formatDate(entry.last_contacted_at) : "Never"}
          icon={Phone}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="library-waitlist-detail" entityType="entity_waitlist" record={entry}>
        {/* Contact Information */}
        <DetailSection
          title="Contact Information"
          description="Contact details"
          icon={Users}
        >
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Avatar name={entry.name} src={entry.person?.photo_url} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{entry.name}</p>
              {entry.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {entry.phone}
                </p>
              )}
              {entry.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  {entry.email}
                </p>
              )}
            </div>
          </div>
        </DetailSection>

        {/* Preferences */}
        <DetailSection
          title="Preferences"
          description="Preferred options"
          icon={Clock}
        >
          <InfoRow
            label="Library"
            value={
              entry.library ? (
                <Link href={`/library/${entry.library.id}`} className="text-primary hover:underline">
                  {entry.library.name}
                </Link>
              ) : "—"
            }
            icon={BookOpen}
          />
          <InfoRow
            label="Preferred Time Slot"
            value={entry.preferred_slot || "No preference"}
            icon={Clock}
          />
          <InfoRow
            label="Preferred Plan"
            value={entry.preferred_plan || "No preference"}
          />
        </DetailSection>

        {/* Contact History */}
        {(entry.last_contacted_at || entry.contact_notes) && (
          <DetailSection
            title="Contact History"
            description="Recent contact attempts"
            icon={MessageSquare}
          >
            {entry.last_contacted_at && (
              <InfoRow
                label="Last Contacted"
                value={formatDateTime(entry.last_contacted_at)}
                icon={Calendar}
              />
            )}
            {entry.contact_notes && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{entry.contact_notes}</p>
              </div>
            )}
          </DetailSection>
        )}

        {/* Conversion Info */}
        {entry.status === "converted" && entry.converted_member && (
          <DetailSection
            title="Conversion"
            description="Member conversion details"
            icon={Check}
          >
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success font-medium mb-2">
                Converted to Member
              </p>
              <Link
                href={`/library-members/${(entry.converted_member as { id: string }).id}`}
                className="text-success hover:underline font-medium"
              >
                {(entry.converted_member as { name: string }).name}
                {(entry.converted_member as { member_code?: string }).member_code && (
                  <span className="font-mono ml-1">
                    ({(entry.converted_member as { member_code: string }).member_code})
                  </span>
                )}
              </Link>
              {entry.converted_at && (
                <p className="text-xs text-success/80 mt-1">
                  Converted on {formatDate(entry.converted_at)}
                </p>
              )}
            </div>
          </DetailSection>
        )}

        {/* Notes */}
        {entry.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={MessageSquare}
          >
            <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
          </DetailSection>
        )}
      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
