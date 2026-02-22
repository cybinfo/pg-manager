"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { SubmitButton } from "@/components/ui/submit-button"

function ResetPasswordForm() {
  const { handleSuccess } = useFormSubmit({
    successMessage: "Password updated successfully!",
    redirectTo: "/login",
    redirectDelay: 3000,
  })
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    // Check if we have the necessary session from the reset link
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        // Check if there's an error in the URL params (Supabase adds these on error)
        const errorCode = searchParams.get("error")
        const errorDescription = searchParams.get("error_description")

        if (errorCode) {
          setError(errorDescription || "Invalid or expired reset link")
        } else {
          setError("Invalid or expired reset link. Please request a new password reset.")
        }
      }
      setVerifying(false)
    }

    checkSession()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        showError(error.message)
        return
      }

      setSuccess(true)
      handleSuccess()
    } catch {
      showError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950 px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-teal-500 animate-spin" />
            </div>
            <CardTitle>Verifying...</CardTitle>
            <CardDescription>
              Please wait while we verify your reset link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950 px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-rose-500" />
            </div>
            <CardTitle>Link Invalid or Expired</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request new reset link</Button>
            </Link>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950 px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-teal-500" />
            </div>
            <CardTitle>Password Updated!</CardTitle>
            <CardDescription>
              Your password has been successfully updated. Redirecting you to sign in...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please wait...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthCardLayout
      title="Set new password"
      description="Enter your new password below."
    >
      <form onSubmit={handleResetPassword}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton loading={loading} className="w-full" loadingText="Updating password...">
            Update password
          </SubmitButton>
        </CardFooter>
      </form>
    </AuthCardLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
