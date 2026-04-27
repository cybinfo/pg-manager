"use client"

import { useState, Suspense, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSession } from "@/lib/auth/session"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { ContextPicker } from "@/components/auth/context-picker"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { BrandLogo } from "@/components/ui/brand-logo"
import { SubmitButton } from "@/components/ui/submit-button"
import { ContextWithDetails } from "@/lib/auth/types"
import { brandGradient } from "@/lib/design-tokens"

type LoginStep = 'credentials' | 'email-sent' | 'context-picker'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")
  const inviteToken = searchParams.get("invite")
  const authError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [contexts, setContexts] = useState<ContextWithDetails[]>([])
  const [userName, setUserName] = useState<string>('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [emailActuallySent, setEmailActuallySent] = useState(false)
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()
  const mountedRef = useRef(true)

  // Check for existing session on mount using centralized session handling
  useEffect(() => {
    mountedRef.current = true

    const checkSession = async () => {
      // Use centralized session check
      const sessionResult = await getSession()

      if (sessionResult.error) {
        // Session check failed - this is expected for non-logged in users
        console.log('[Login] No existing session:', sessionResult.error.message)
        return
      }

      if (!sessionResult.session?.user) {
        return
      }

      if (!mountedRef.current) return

      const user = sessionResult.session.user

      // User already logged in, fetch contexts
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const { data: userContexts, error: contextError } = await (supabase.rpc as Function)('get_user_contexts', {
        p_user_id: user.id
      })

      if (contextError) {
        console.error('[Login] Error fetching contexts:', contextError)
        // Redirect to dashboard anyway - it will handle setup
        router.push('/dashboard')
        return
      }

      if (!mountedRef.current) return

      if (userContexts && userContexts.length > 0) {
        if (userContexts.length === 1) {
          // Single context - redirect directly
          handleContextSelect(userContexts[0].context_id, false)
        } else {
          // Multiple contexts - show picker
          setContexts(userContexts)
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '')
          setStep('context-picker')
        }
      } else {
        // No contexts - redirect to dashboard (will handle setup)
        router.push('/dashboard')
      }
    }
    checkSession()

    return () => {
      mountedRef.current = false
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        showError(error.message)
        return
      }

      if (!data.user) {
        showError("Login failed")
        return
      }

      // Sign out the password session — user must verify via email link (E1 principle)
      await supabase.auth.signOut()

      // Send magic link to the user's email, routing back through our callback
      // If invite token present, pass next=/invite/TOKEN so post-auth auto-accepts
      const callbackNext = inviteToken ? `/invite/${inviteToken}` : null
      const callbackUrl = callbackNext
        ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(callbackNext)}`
        : `${window.location.origin}/api/auth/callback`
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: callbackUrl,
        },
      })

      if (otpError) {
        if (otpError.status === 429) {
          showError("A sign-in link was recently sent — check your inbox (or spam).")
          setEmailActuallySent(false)
          startResendCooldown()
          setStep('email-sent')
        } else {
          showError("Failed to send verification email. Please try again.")
        }
        return
      }

      showSuccess("Verification email sent")
      setEmailActuallySent(true)
      startResendCooldown()
      setStep('email-sent')
    } catch {
      showError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const startResendCooldown = () => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
    setResendCooldown(60)
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
          cooldownIntervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendLink = async () => {
    if (resendCooldown > 0) return
    setResendLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin + '/api/auth/callback',
        },
      })
      if (error) {
        if (error.status === 429) {
          showError("Too many attempts — please wait 60 seconds before trying again.")
          startResendCooldown()
        } else {
          showError("Failed to resend. Please try again.")
        }
      } else {
        showSuccess("New link sent to your email")
        startResendCooldown()
      }
    } finally {
      setResendLoading(false)
    }
  }

  const handleContextSelect = async (contextId: string, remember: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Log the context switch
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      await (supabase.rpc as Function)('switch_context', {
        p_user_id: user.id,
        p_to_context_id: contextId,
        p_from_context_id: null,
      })

      // Store in localStorage
      localStorage.setItem('currentContextId', contextId)

      if (remember) {
        // Set as default context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        await (supabase.rpc as Function)('set_default_context', {
          p_user_id: user.id,
          p_context_id: contextId,
        })
      }

      // Determine redirect based on context type
      const selectedContext = contexts.find(c => c.context_id === contextId)

      if (selectedContext?.context_type === 'tenant') {
        router.push('/tenant')
      } else if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.push('/dashboard')
      }
      // Don't use router.refresh() - it causes full page reload and remount issues
    } catch (error) {
      console.error('Error selecting context:', error)
      showError('Failed to select account')
    }
  }

  // Show email sent step
  if (step === 'email-sent') {
    return (
      <AuthCardLayout
        title="Check your email"
        description={
          emailActuallySent
            ? `We sent a login link to ${email}`
            : `A sign-in link was recently sent to ${email}`
        }
      >
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {emailActuallySent
              ? "Click the link in the email to complete sign in. Check your spam folder if you don't see it."
              : "Check your inbox (and spam folder) for a recent sign-in link. If you don't find one, wait a moment and resend."}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={handleResendLink}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend link"}
            </button>
          </p>
        </CardContent>
        <CardFooter>
          <button
            type="button"
            onClick={() => setStep('credentials')}
            className="w-full text-sm text-muted-foreground hover:text-primary"
          >
            Back to sign in
          </button>
        </CardFooter>
      </AuthCardLayout>
    )
  }

  // Show context picker
  if (step === 'context-picker') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${brandGradient.pageBg} px-4`}>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <BrandLogo />
          </div>

          <ContextPicker
            contexts={contexts}
            onSelect={handleContextSelect}
            userName={userName}
          />

          <p className="text-center text-sm text-muted-foreground mt-4">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setStep('credentials')
                setContexts([])
              }}
              className="text-primary hover:underline"
            >
              Sign in with a different account
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Show login form
  return (
    <AuthCardLayout
      title="Welcome back"
      description="Enter your credentials to access your account"
      headerExtra={
        authError === 'link_expired' ? (
          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded-lg">
            That login link has expired. Please sign in again.
          </div>
        ) : inviteToken ? (
          <div className="mt-2 p-2 bg-success/10 text-success text-sm rounded-lg">
            Sign in to accept your invitation
          </div>
        ) : undefined
      }
    >
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton loading={loading} disabled={loading || resendCooldown > 0} className="w-full" loadingText="Signing in...">
            {resendCooldown > 0 ? `Please wait ${resendCooldown}s…` : "Sign in"}
          </SubmitButton>
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up free
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCardLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
