"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, AlertCircle, MapPin, Hash, Calendar } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { formatDate } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"

export default function MemberLockerPage() {
  const { member, loading } = useMemberPortalData()

  if (loading) return <PageSkeleton variant="detail" />

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Locker</h1>
        <p className="text-muted-foreground">Your assigned locker details</p>
      </div>

      {member.locker ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Locker #{member.locker.locker_number}</CardTitle>
                <CardDescription>Assigned to your membership</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Locker Number</p>
                  <p className="font-semibold text-lg">#{member.locker.locker_number}</p>
                </div>
              </div>

              {member.library && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Library</p>
                    <p className="font-semibold">{member.library.name}</p>
                  </div>
                </div>
              )}

              {member.join_date && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-semibold">{formatDate(member.join_date)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-info/10 border border-info/20 rounded-lg text-sm text-info">
              <p>
                <strong>Important:</strong> Keep your locker key safe. Report any issues to the library staff.
                Lockers are for personal use only during your active membership.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Locker Assigned</h3>
            <p className="text-muted-foreground max-w-sm">
              You don&apos;t have a locker assigned to your membership. Contact your library staff if you&apos;d like to rent one.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
