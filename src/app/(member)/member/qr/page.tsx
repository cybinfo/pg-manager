"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Info, AlertCircle } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { MemberQRCode } from "@/components/library"
import { useMemberQR } from "@/lib/hooks/useMemberQR"

export default function MemberQRPage() {
  const { member, featureAvailable, loading } = useMemberQR()

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!featureAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">QR Code Not Available</h2>
        <p className="text-muted-foreground">This feature has not been enabled by your library.</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  const displayName = member.person?.name || member.name

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My QR Code</h1>
        <p className="text-muted-foreground">Use this for quick check-in at the library</p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <MemberQRCode
          memberId={member.id}
          memberName={displayName}
          memberCode={member.member_code}
          libraryId={member.entity_id}
          size={250}
          showCard={true}
        />
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Show this QR code</span> at the library reception or self-service kiosk
            </li>
            <li>
              <span className="text-foreground font-medium">Staff will scan</span> the code to check you in automatically
            </li>
            <li>
              <span className="text-foreground font-medium">Hours are deducted</span> when you check out
            </li>
            <li>
              <span className="text-foreground font-medium">Download the QR code</span> to save it on your phone for easy access
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Library Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Details
          </CardTitle>
          <CardDescription>
            This QR code is unique to your membership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Member Name</p>
              <p className="font-medium">{displayName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member Code</p>
              <p className="font-medium font-mono">{member.member_code || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Library</p>
              <p className="font-medium">{member.library?.name || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member ID</p>
              <p className="font-medium font-mono text-xs">{member.id.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
