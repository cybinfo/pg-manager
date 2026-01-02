"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, CheckCircle, XCircle, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface EmailVerificationCardProps {
  userId: string
  email: string
  userName: string
  emailVerified: boolean
  emailVerifiedAt?: string | null
  onVerificationSent?: () => void
}

export function EmailVerificationCard({
  userId,
  email,
  userName,
  emailVerified,
  emailVerifiedAt,
  onVerificationSent,
}: EmailVerificationCardProps) {
  const [sending, setSending] = useState(false)

  const handleSendVerification = async () => {
    setSending(true)

    try {
      const response = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, userName }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Verification email sent! Check your inbox.")
        onVerificationSent?.()
      } else {
        toast.error(data.error || "Failed to send verification email")
      }
    } catch (error) {
      toast.error("An error occurred while sending verification email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              emailVerified ? "bg-green-100" : "bg-amber-100"
            )}>
              <Mail className={cn(
                "h-5 w-5",
                emailVerified ? "text-green-600" : "text-amber-600"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">Email Verification</CardTitle>
              <CardDescription>Verify your email to enable all features</CardDescription>
            </div>
          </div>
          <Badge className={cn(
            emailVerified
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {emailVerified ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Not Verified
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">{email}</p>
            {emailVerified && emailVerifiedAt && (
              <p className="text-xs text-muted-foreground">
                Verified on {new Date(emailVerifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {emailVerified ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendVerification}
              disabled={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Verification
                </>
              )}
            </Button>
          )}
        </div>

        {!emailVerified && (
          <p className="text-sm text-muted-foreground">
            Click the button above to receive a verification email. Check your spam folder if you don't see it.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
