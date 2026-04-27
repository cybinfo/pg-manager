"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Building2, User, Home, ArrowRight, CheckCircle, Clock, Loader2 } from "lucide-react"
import { brandGradient } from "@/lib/design-tokens"

interface InviteInfo {
  expired: boolean
  status?: string
  invitation?: {
    id: string
    name: string | null
    email: string | null
    context_type: string
    workspace: { id: string; name: string; logo_url: string | null } | null
    entity: { name: string | null; property: string | null; room: string | null } | null
  }
}

export default function InviteTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function init() {
      // Check auth state
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Fetch invite info
      const res = await fetch(`/api/invitations/${token}`)
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      setInfo(json.data as InviteInfo)
      setLoading(false)

      // If user is already authenticated and invite is valid, auto-accept
      if (user && json.data && !json.data.expired) {
        setAccepting(true)
        const acceptRes = await fetch(`/api/invitations/${token}/accept`, { method: "POST" })
        if (acceptRes.ok) {
          setAccepted(true)
          setTimeout(() => router.push("/tenant"), 2000)
        }
        setAccepting(false)
      }
    }
    init()
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-card border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">Invitation Not Found</h1>
          <p className="text-muted-foreground text-sm">This invitation link is invalid or has been removed.</p>
        </div>
      </div>
    )
  }

  if (info.expired) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-card border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            Invitation {info.status === "accepted" ? "Already Used" : "Expired"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {info.status === "accepted"
              ? "This invitation has already been accepted. Please log in to access your account."
              : "This invitation link has expired. Please ask your property manager to send a new one."}
          </p>
          {info.status === "accepted" && (
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Log in <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-card border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-xl font-bold mb-2">You&apos;re in!</h1>
          <p className="text-muted-foreground text-sm">Invitation accepted. Redirecting to your portal…</p>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mt-4" />
        </div>
      </div>
    )
  }

  if (accepting) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-card border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Accepting invitation…</p>
        </div>
      </div>
    )
  }

  const inv = info.invitation!
  const workspaceName = inv.workspace?.name || "ManageKar"
  const tenantName = inv.name || inv.entity?.name
  const property = inv.entity?.property
  const room = inv.entity?.room
  const contextLabel = inv.context_type === "tenant" ? "Tenant" : inv.context_type === "staff" ? "Staff" : "Member"

  const encodedName = encodeURIComponent(tenantName || "")
  const encodedEmail = encodeURIComponent(inv.email || "")
  const loginUrl = `/login?invite=${token}&redirect=/invite/${token}`
  const registerUrl = `/register?invite=${token}&name=${encodedName}&email=${encodedEmail}`

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`h-16 w-16 rounded-2xl ${brandGradient.solid} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{workspaceName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            You&apos;ve been invited to join as a{" "}
            <span className="font-medium text-foreground">{contextLabel}</span>
          </p>
        </div>

        {/* Invitation details */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-3">
          {tenantName && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">{tenantName}</span>
            </div>
          )}
          {property && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{property}</span>
            </div>
          )}
          {room && (
            <div className="flex items-center gap-3">
              <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">Room {room}</span>
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <div className="text-center text-sm text-muted-foreground">
            <p>You&apos;re already logged in. If the invitation didn&apos;t auto-accept, please contact your property manager.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Link
                href={registerUrl}
                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl ${brandGradient.solid} text-white font-medium hover:opacity-90 transition-opacity shadow-md`}
              >
                Create my account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={loginUrl}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                I already have an account — Log in
              </Link>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
              <p>Your details are pre-filled. You only need to set a password to get started.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
