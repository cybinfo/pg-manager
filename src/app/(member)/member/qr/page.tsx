"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Info } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { MemberQRCode } from "@/components/library"

interface MemberData {
  id: string
  name: string
  member_code: string | null
  library_id: string
  library: {
    name: string
  } | null
}

export default function MemberQRPage() {
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: memberData } = await supabase
        .from("library_members")
        .select(`
          id,
          name,
          member_code,
          library_id,
          library:libraries(name)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (memberData) {
        const library = Array.isArray(memberData.library)
          ? memberData.library[0]
          : memberData.library

        setMember({
          ...memberData,
          library,
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!member) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Member data not found</p>
      </div>
    )
  }

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
          memberName={member.name}
          memberCode={member.member_code}
          libraryId={member.library_id}
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
              <p className="font-medium">{member.name}</p>
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
