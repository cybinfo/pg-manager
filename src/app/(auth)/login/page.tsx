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

type LoginStep = 'credentials' | 'otp-verification' | 'context-picker'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")
  const inviteToken = searchParams.get("invite")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [contexts, setContexts] = useState<ContextWithDetails[]>([])
  const [userName, setUserName] = useState<string>('')
  // OTP verification state
  const [otpCode, setOtpCode] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [pendingContexts, setPendingContexts] = useState<ContextWithDetails[]>([])
  const [pendingUserName, setPendingUserName] = useState<string>('')

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

      // Fetch user contexts while we have an authenticated session
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const { data: userContexts } = await (supabase.rpc as Function)('get_user_contexts', {
        p_user_id: data.user.id
      })

      const contextsArray = (userContexts || []) as ContextWithDetails[]
      const resolvedName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || ''

      // Store for use after OTP verification
      setPendingContexts(contextsArray)
      setPendingUserName(resolvedName)

      // Sign out the password session — user must verify via OTP (E1 principle)
      await supabase.auth.signOut()

      // Send OTP to the user's email
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })

      if (otpError) {
        showError("Failed to send verification code. Please try again.")
        return
      }

      showSuccess("Verification code sent to your email")
      setStep('otp-verification')
    } catch {
      showError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      })

      if (error) {
        showError("Invalid or expired code. Please try again.")
        return
      }

      // OTP verified — proceed using contexts stored from password auth
      if (pendingContexts.length === 0) {
        showSuccess("Welcome back!")
        router.push(redirectTo || '/dashboard')
      } else if (pendingContexts.length === 1) {
        const ctx = pendingContexts[0]
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            await (supabase.rpc as Function)('switch_context', {
              p_user_id: user.id,
              p_to_context_id: ctx.context_id,
              p_from_context_id: null,
            })
            localStorage.setItem('currentContextId', ctx.context_id)
          }
        } catch { /* non-critical, redirect anyway */ }
        showSuccess("Welcome back!")
        router.push(ctx.context_type === 'tenant' ? '/tenant' : redirectTo || '/dashboard')
      } else {
        setContexts(pendingContexts)
        setUserName(pendingUserName)
        setStep('context-picker')
        showSuccess("Welcome back!")
      }
    } catch {
      showError("An unexpected error occurred")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) showError("Failed to resend code. Please try again.")
    else showSuccess("New code sent to your email")
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

  // Show OTP verification step
  if (step === 'otp-verification') {
    return (
      <AuthCardLayout
        title="Verify your identity"
        description={`Enter the 6-digit code sent to ${email}`}
      >
        <form onSubmit={handleVerifyOtp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={otpLoading}
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Didn&apos;t receive a code?{" "}
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-primary hover:underline"
                disabled={otpLoading}
              >
                Resend
              </button>
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <SubmitButton loading={otpLoading} className="w-full" loadingText="Verifying...">
              Verify &amp; Sign in
            </SubmitButton>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setOtpCode("") }}
              className="text-sm text-muted-foreground hover:text-primary"
              disabled={otpLoading}
            >
              Back to sign in
            </button>
          </CardFooter>
        </form>
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
      headerExtra={inviteToken ? (
        <div className="mt-2 p-2 bg-success/10 text-success text-sm rounded-lg">
          Sign in to accept your invitation
        </div>
      ) : undefined}
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
          <SubmitButton loading={loading} className="w-full" loadingText="Signing in...">
            Sign in
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
