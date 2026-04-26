"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BrandLogo } from "@/components/ui/brand-logo"
import { brandGradient } from "@/lib/design-tokens"

type VerificationStatus = "loading" | "success" | "error" | "no-token"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<VerificationStatus>(token ? "loading" : "no-token")
  const [email, setEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-compiler/react-compiler
      setStatus("no-token")
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/verify-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus("success")
          setEmail(data.email)
        } else {
          setStatus("error")
          setErrorMessage(data.error || "Verification failed")
        }
      } catch (error) {
        setStatus("error")
        setErrorMessage("An unexpected error occurred")
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className={`min-h-screen flex items-center justify-center ${brandGradient.pageBg} p-4`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BrandLogo size="lg" />
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-info/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-info animate-spin" />
                </div>
                <CardTitle className="text-2xl">Verifying Email</CardTitle>
                <CardDescription>Please wait while we verify your email address...</CardDescription>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl text-success">Email Verified!</CardTitle>
                <CardDescription>
                  Your email address {email && <span className="font-medium">{email}</span>} has been verified successfully.
                </CardDescription>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Verification Failed</CardTitle>
                <CardDescription className="text-destructive">
                  {errorMessage || "Unable to verify your email address."}
                </CardDescription>
              </>
            )}

            {status === "no-token" && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-warning" />
                </div>
                <CardTitle className="text-2xl">No Verification Token</CardTitle>
                <CardDescription>
                  This page requires a verification token. Please check your email for the verification link.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {status === "success" && (
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className={`w-full ${brandGradient.button}`}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/login")}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  The verification link may have expired or already been used.
                </p>
                <Button
                  onClick={() => router.push("/settings")}
                  className={`w-full ${brandGradient.button}`}
                >
                  Request New Verification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/login")}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            )}

            {status === "no-token" && (
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/login")}
                  className={`w-full ${brandGradient.button}`}
                >
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{" "}
          <Link href="/help" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className={`min-h-screen flex items-center justify-center ${brandGradient.pageBg} p-4`}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BrandLogo size="lg" linkTo={null} />
        </div>
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-info/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-info animate-spin" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
